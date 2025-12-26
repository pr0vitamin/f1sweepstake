import { createClient } from "@/lib/supabase/server";
import { TeamForm } from "@/components/admin/forms/team-form";

export default async function NewTeamPage() {
    const supabase = await createClient();

    // Fetch current season ID
    const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single();

    if (!season) {
        return <div>Error: No active season found. Please create a season first.</div>;
    }

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Create Team</h2>
            </div>
            <div className="border rounded-lg p-8">
                <TeamForm seasonId={season.id} />
            </div>
        </div>
    );
}
