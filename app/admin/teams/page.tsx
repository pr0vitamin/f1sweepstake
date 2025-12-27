import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Team, Season } from "@/lib/types/database";
import { SeasonSelector } from "@/components/admin/season-selector";

interface TeamsPageProps {
    searchParams: Promise<{ season?: string }>;
}

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
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

    if (!selectedSeasonId) {
        return (
            <div className="flex flex-col gap-6">
                <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
                <p className="text-muted-foreground">No seasons found. Please create a season first.</p>
            </div>
        );
    }

    // Fetch teams for the selected season
    const { data: teams, error } = await supabase
        .from("teams")
        .select("*")
        .eq("season_id", selectedSeasonId)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching teams:", error);
        return <div>Error loading teams</div>;
    }

    const typedTeams = teams as Team[];
    const typedSeasons = seasons as Season[];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
                    <SeasonSelector
                        seasons={typedSeasons}
                        currentSeasonId={selectedSeasonId}
                    />
                </div>
                {currentSeason?.id === selectedSeasonId && (
                    <Button asChild>
                        <Link href={`/admin/teams/new?season=${selectedSeasonId}`}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Team
                        </Link>
                    </Button>
                )}
            </div>
            <DataTable columns={columns} data={typedTeams} />
        </div>
    );
}
