import { createClient } from "@/lib/supabase/server";
import { RaceForm } from "@/components/admin/forms/race-form";

export default async function NewRacePage() {
    const supabase = await createClient();

    // Fetch active season
    const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single();

    if (!season) {
        return <div>Error: No active season found.</div>;
    }

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Create Race</h2>
            </div>
            <div className="border rounded-lg p-8">
                <RaceForm seasonId={season.id} />
            </div>
        </div>
    );
}
