import { createClient } from "@/lib/supabase/server";
import { DriverForm } from "@/components/admin/forms/driver-form";
import { Team } from "@/lib/types/database";

export default async function NewDriverPage() {
    const supabase = await createClient();

    // Fetch active season to filter teams if needed, or better, fetch all active teams
    // For simplicity, we fetch all teams. In real app, might want only current season's teams.
    const { data: teams, error } = await supabase
        .from("teams")
        .select("*")
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
