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

    // 2. Find race with picks_open = true
    const { data: race, error: raceError } = await supabase
        .from("races")
        .select("*")
        .eq("picks_open", true)
        .single();

    if (raceError || !race) {
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
        .select("*, team:teams(*)")
        .eq("is_active", true)
        .order("driver_number");

    if (driversError) {
        return <div>Error loading drivers</div>;
    }

    return (
        <div className="container py-6">
            <DraftRoom
                raceId={race.id}
                raceName={race.name}
                draftOrder={race.draft_order as DraftOrderEntry[]}
                initialPicks={picks as (Pick & { driver: DriverWithTeam })[]}
                availableDrivers={drivers as DriverWithTeam[]}
                currentUserId={user.id}
            />
        </div>
    );
}
