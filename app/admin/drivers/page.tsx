import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { DriverWithTeam, Season } from "@/lib/types/database";
import { SeasonSelector } from "@/components/admin/season-selector";

interface DriversPageProps {
    searchParams: Promise<{ season?: string }>;
}

export default async function DriversPage({ searchParams }: DriversPageProps) {
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
                <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
                <p className="text-muted-foreground">No seasons found. Please create a season first.</p>
            </div>
        );
    }

    // Fetch drivers with team info, filtering by team's season
    const { data: drivers, error } = await supabase
        .from("drivers")
        .select("*, team:teams!inner(*)")
        .eq("team.season_id", selectedSeasonId)
        .order("driver_number", { ascending: true });

    if (error) {
        console.error("Error fetching drivers:", error);
        return <div>Error loading drivers</div>;
    }

    const typedDrivers = drivers as DriverWithTeam[];
    const typedSeasons = seasons as Season[];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
                    <SeasonSelector
                        seasons={typedSeasons}
                        currentSeasonId={selectedSeasonId}
                    />
                </div>
                {currentSeason?.id === selectedSeasonId && (
                    <Button asChild>
                        <Link href={`/admin/drivers/new?season=${selectedSeasonId}`}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Driver
                        </Link>
                    </Button>
                )}
            </div>
            <DataTable columns={columns} data={typedDrivers} />
        </div>
    );
}
