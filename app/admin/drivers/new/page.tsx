import { createClient } from "@/lib/supabase/server";
import { DriverForm } from "@/components/admin/forms/driver-form";
import { Team } from "@/lib/types/database";

export default async function NewDriverPage() {
    const supabase = await createClient();

    // Get the current season
    const { data: currentSeason } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single();

    if (!currentSeason) {
        return <div>No current season found. Please set a season as current first.</div>;
    }

    // Fetch only teams from the current season
    const { data: teams, error } = await supabase
        .from("teams")
        .select("*")
        .eq("season_id", currentSeason.id)
        .eq("is_active", true)
        .order("name");

    if (error || !teams) {
        return <div>Error loading teams. Please create a team first.</div>;
    }

    const typedTeams = teams as Team[];

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Create Driver</h2>
            </div>
            <div className="border rounded-lg p-8">
                <DriverForm teams={typedTeams} />
            </div>
        </div>
    );
}
