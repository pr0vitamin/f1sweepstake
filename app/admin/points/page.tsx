import { createClient } from "@/lib/supabase/server";
import { Season, PointMapping } from "@/lib/types/database";
import { SeasonSelector } from "@/components/admin/season-selector";
import { PointsEditor } from "@/components/admin/points-editor";

interface PointsPageProps {
    searchParams: Promise<{ season?: string }>;
}

export default async function PointsPage({ searchParams }: PointsPageProps) {
    const supabase = await createClient();
    const params = await searchParams;

    // Fetch all seasons for the selector
    const { data: seasons } = await supabase
        .from("seasons")
        .select("*")
        .order("year", { ascending: false });

    // Find current season or use from URL
    const currentSeason = seasons?.find(s => s.is_current);
    const selectedSeasonId = params.season || currentSeason?.id;
    const selectedSeason = seasons?.find(s => s.id === selectedSeasonId);

    if (!selectedSeasonId || !selectedSeason) {
        return (
            <div className="flex flex-col gap-6">
                <h1 className="text-3xl font-bold tracking-tight">Points Configuration</h1>
                <p className="text-muted-foreground">No seasons found. Please create a season first.</p>
            </div>
        );
    }

    // Fetch point mappings for the selected season
    const { data: pointMappings, error } = await supabase
        .from("point_mappings")
        .select("*")
        .eq("season_id", selectedSeasonId)
        .order("position", { ascending: true });

    if (error) {
        console.error("Error fetching point mappings:", error);
        return <div>Error loading point mappings</div>;
    }

    const typedMappings = pointMappings as PointMapping[];
    const typedSeasons = seasons as Season[];
    const typedSelectedSeason = selectedSeason as Season;
    const isCurrentSeason = currentSeason?.id === selectedSeasonId;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Points Configuration</h1>
                    <SeasonSelector
                        seasons={typedSeasons}
                        currentSeasonId={selectedSeasonId}
                    />
                </div>
            </div>

            <p className="text-muted-foreground">
                Configure how many points each finishing position earns. Negative points can be assigned for lower positions.
            </p>

            <PointsEditor
                key={selectedSeasonId}
                season={typedSelectedSeason}
                pointMappings={typedMappings}
                isEditable={isCurrentSeason}
            />
        </div>
    );
}
