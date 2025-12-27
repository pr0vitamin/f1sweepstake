import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Race, Driver, RaceResult } from "@/lib/types/database";
import { ResultsManager } from "@/components/admin/results-manager";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface RaceResultsPageProps {
    params: Promise<{ id: string }>;
}

export default async function RaceResultsPage({ params }: RaceResultsPageProps) {
    const { id: raceId } = await params;
    const supabase = await createClient();

    // Fetch the race
    const { data: race, error: raceError } = await supabase
        .from("races")
        .select("*, season:seasons(*)")
        .eq("id", raceId)
        .single();

    if (raceError || !race) {
        redirect("/admin/races");
    }

    // Fetch existing results for this race
    const { data: existingResults } = await supabase
        .from("race_results")
        .select("*, driver:drivers(*, team:teams(*))")
        .eq("race_id", raceId)
        .order("position", { ascending: true });

    // Fetch all active drivers for the season (for matching)
    // Use inner join syntax to filter by team's season
    const { data: drivers } = await supabase
        .from("drivers")
        .select("*, team:teams!inner(*)")
        .eq("team.season_id", race.season_id)
        .eq("is_active", true)
        .order("driver_number");

    const typedRace = race as Race & { season: { year: number } };
    const typedResults = (existingResults || []) as (RaceResult & { driver: Driver })[];
    const typedDrivers = (drivers || []) as (Driver & { team: { name: string; color: string } })[];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/races">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Races
                    </Link>
                </Button>
            </div>

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">
                    Race Results: {typedRace.name}
                </h1>
                <p className="text-muted-foreground">
                    {typedRace.location} • Round {typedRace.round_number} • {typedRace.season.year}
                </p>
            </div>

            <ResultsManager
                race={typedRace}
                seasonYear={typedRace.season.year}
                existingResults={typedResults}
                drivers={typedDrivers}
            />
        </div>
    );
}
