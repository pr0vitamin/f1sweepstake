import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DraftRoom } from "@/components/draft-room";
import { DraftOrderEntry } from "@/lib/draft-order";
import { DriverWithTeam, Pick } from "@/lib/types/database";

export default async function DraftPage() {
    const supabase = await createClient();

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");

    // 2. Find race that is either:
    //    - picks_open = true (active draft), OR
    //    - picks_open = false AND results_finalized = false AND has draft_order (completed draft, awaiting results)
    let race = null;

    // First, try to find an active draft
    const { data: activeRaces } = await supabase
        .from("races")
        .select("*")
        .eq("picks_open", true)
        .limit(1);

    if (activeRaces && activeRaces.length > 0) {
        race = activeRaces[0];
    } else {
        // Look for the most recent race that's closed but not finalized and has a draft_order
        const { data: pendingRaces } = await supabase
            .from("races")
            .select("*")
            .eq("picks_open", false)
            .eq("results_finalized", false)
            .not("draft_order", "is", null)
            .order("race_date", { ascending: false })
            .limit(1);

        if (pendingRaces && pendingRaces.length > 0) {
            race = pendingRaces[0];
        }
    }

    if (!race) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <h1 className="text-2xl font-bold mb-2">No Active Draft</h1>
                <p className="text-muted-foreground">
                    There is no race currently open for picks. Check back later!
                </p>
            </div>
        );
    }

    if (!race.draft_order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <h1 className="text-2xl font-bold mb-2">Draft Not Ready</h1>
                <p className="text-muted-foreground">
                    The admin hasn't set up the draft order yet. Please wait.
                </p>
            </div>
        );
    }

    // 3. Fetch picks with driver details
    const { data: picks, error: picksError } = await supabase
        .from("picks")
        .select("*, driver:drivers(*, team:teams(*))")
        .eq("race_id", race.id)
        .order("pick_order");

    if (picksError) {
        return <div>Error loading picks</div>;
    }

    // 4. Fetch available drivers (active drivers from current season)
    const { data: drivers, error: driversError } = await supabase
        .from("drivers")
        .select("*, team:teams!inner(*)")
        .eq("team.season_id", race.season_id)
        .eq("is_active", true);

    if (driversError) {
        return <div>Error loading drivers</div>;
    }

    // Sort drivers by team name, then driver number
    const sortedDrivers = [...(drivers || [])].sort((a, b) => {
        const teamCompare = (a.team?.name || "").localeCompare(b.team?.name || "");
        if (teamCompare !== 0) return teamCompare;
        return (a.driver_number || 0) - (b.driver_number || 0);
    });

    // 5. Check if current user is admin
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    const isAdmin = profile?.is_admin ?? false;
    const isReadOnly = !race.picks_open; // Read-only if picks are closed

    return (
        <div className="container py-6">
            <DraftRoom
                raceId={race.id}
                raceName={race.name}
                draftOrder={race.draft_order as DraftOrderEntry[]}
                initialPicks={picks as (Pick & { driver: DriverWithTeam })[]}
                availableDrivers={sortedDrivers as DriverWithTeam[]}
                currentUserId={user.id}
                isAdmin={isAdmin}
                isReadOnly={isReadOnly}
            />
        </div>
    );
}
