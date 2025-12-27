import { createClient } from "@/lib/supabase/server";
import { SeasonForm } from "@/components/admin/forms/season-form";

export default async function NewSeasonPage() {
    const supabase = await createClient();

    // Fetch the current season to enable copy feature
    const { data: currentSeason } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single();

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Create Season</h2>
            </div>
            <div className="border rounded-lg p-8">
                <SeasonForm currentSeasonId={currentSeason?.id} />
            </div>
        </div>
    );
}
