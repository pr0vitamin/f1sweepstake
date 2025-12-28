import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Flag, MapPin, Calendar, Trophy, ArrowLeft, Users } from "lucide-react";

type Props = {
    params: Promise<{ id: string }>;
}

export default async function RaceDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch the race with season info
    const { data: race, error } = await supabase
        .from("races")
        .select("*, season:seasons(*)")
        .eq("id", id)
        .single();

    if (error || !race) {
        notFound();
    }

    // Fetch picks for this race with driver and user info
    const { data: picks } = await supabase
        .from("picks")
        .select("*, driver:drivers(*, team:teams(*)), profile:profiles(display_name)")
        .eq("race_id", id)
        .order("pick_order");

    // Fetch race results if finalized
    const { data: results } = await supabase
        .from("race_results")
        .select("*, driver:drivers(*, team:teams(*))")
        .eq("race_id", id)
        .order("position");

    // Fetch point mappings for scoring
    const { data: pointMappings } = await supabase
        .from("point_mappings")
        .select("*")
        .eq("season_id", race.season_id);

    // Get season config for DNF/DSQ points
    const dnfPoints = (race.season as any)?.dnf_points ?? -5;
    const dsqPoints = (race.season as any)?.dsq_points ?? -5;

    // Get user's picks
    const userPicks = picks?.filter(p => p.user_id === user?.id) || [];

    // Helper to get driver's result and points
    const getDriverResult = (driverId: string) => {
        const result = results?.find(r => r.driver_id === driverId);
        if (!result) return null;

        let points = 0;
        let position = result.position;
        let status = `P${position}`;

        if (result.dsq) {
            points = dsqPoints;
            status = "DSQ";
        } else if (result.dnf) {
            points = dnfPoints;
            status = "DNF";
        } else {
            const mapping = pointMappings?.find(m => m.position === position);
            points = mapping?.points ?? 0;
        }

        return { position, status, points };
    };

    const raceDate = parseISO(race.race_date);
    const isPast = raceDate < new Date();

    // Calculate total points for user
    const totalPoints = userPicks.reduce((sum, pick) => {
        const result = getDriverResult(pick.driver_id);
        return sum + (result?.points ?? 0);
    }, 0);

    // Calculate sweepstake leaderboard (all users' points for this race)
    const sweepstakeResults = picks ? (() => {
        // Group picks by user
        const userPicksMap = new Map<string, {
            displayName: string;
            picks: typeof picks;
            totalPoints: number;
        }>();

        picks.forEach(pick => {
            const userId = pick.user_id;
            const displayName = pick.profile?.display_name || "Unknown";

            if (!userPicksMap.has(userId)) {
                userPicksMap.set(userId, { displayName, picks: [], totalPoints: 0 });
            }

            const userEntry = userPicksMap.get(userId)!;
            userEntry.picks.push(pick);

            if (race.results_finalized) {
                const driverResult = getDriverResult(pick.driver_id);
                userEntry.totalPoints += driverResult?.points ?? 0;
            }
        });

        // Convert to array and sort by points (descending)
        return Array.from(userPicksMap.values())
            .sort((a, b) => b.totalPoints - a.totalPoints);
    })() : [];

    return (
        <div className="container py-8">
            {/* Back Button */}
            <Button variant="ghost" size="sm" asChild className="mb-4">
                <Link href="/races">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Races
                </Link>
            </Button>

            {/* Race Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Round {race.round_number}</Badge>
                    {race.results_finalized ? (
                        <Badge variant="secondary">Completed</Badge>
                    ) : race.picks_open ? (
                        <Badge className="bg-green-600">Picks Open</Badge>
                    ) : isPast ? (
                        <Badge variant="outline">Pending Results</Badge>
                    ) : (
                        <Badge variant="outline" className="border-dashed">Upcoming</Badge>
                    )}
                </div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Flag className="h-8 w-8" />
                    {race.name}
                </h1>
                <div className="flex flex-wrap gap-4 mt-2 text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {race.location}
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(raceDate, "MMMM d, yyyy")}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Your Picks */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Your Picks
                            </CardTitle>
                            {race.results_finalized && userPicks.length > 0 && (
                                <Badge variant={totalPoints >= 0 ? "default" : "destructive"}>
                                    {totalPoints > 0 ? "+" : ""}{totalPoints} pts
                                </Badge>
                            )}
                        </div>
                        <CardDescription>
                            {userPicks.length > 0
                                ? race.results_finalized
                                    ? "Your results for this race"
                                    : "Your driver selections for this race"
                                : race.picks_open
                                    ? "You haven't made your picks yet"
                                    : "No picks made for this race"
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {userPicks.length > 0 ? (
                            <div className="space-y-3">
                                {userPicks.map((pick, i) => {
                                    const driverResult = getDriverResult(pick.driver_id);
                                    return (
                                        <div key={pick.id} className="flex items-center justify-between rounded-md border p-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
                                                    style={{ backgroundColor: pick.driver?.team?.color || '#666' }}
                                                >
                                                    {pick.driver?.driver_number}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{pick.driver?.first_name} {pick.driver?.last_name}</p>
                                                    <p className="text-xs text-muted-foreground">{pick.driver?.team?.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {race.results_finalized && driverResult ? (
                                                    <>
                                                        <Badge variant="outline">{driverResult.status}</Badge>
                                                        <Badge variant={driverResult.points >= 0 ? "secondary" : "destructive"}>
                                                            {driverResult.points > 0 ? "+" : ""}{driverResult.points} pts
                                                        </Badge>
                                                    </>
                                                ) : (
                                                    <Badge variant="outline">Pick {i + 1}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : race.picks_open ? (
                            <Button asChild className="w-full">
                                <Link href="/draft">Go to Draft</Link>
                            </Button>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No picks recorded
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Race Results or All Picks */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5" />
                            {race.results_finalized ? "Race Results" : "All Picks"}
                        </CardTitle>
                        <CardDescription>
                            {race.results_finalized
                                ? "Final race standings"
                                : picks && picks.length > 0
                                    ? "Everyone's driver selections"
                                    : "No picks made yet"
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {race.results_finalized && results && results.length > 0 ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {results.map((result) => {
                                    const resultInfo = getDriverResult(result.driver_id);
                                    return (
                                        <div key={result.id} className="flex items-center justify-between rounded-md border p-2">
                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    variant="outline"
                                                    className={`w-10 justify-center ${result.position === 1 ? "bg-yellow-500 text-white border-yellow-600" :
                                                        result.position === 2 ? "bg-gray-400 text-white border-gray-500" :
                                                            result.position === 3 ? "bg-amber-700 text-white border-amber-800" : ""
                                                        }`}
                                                >
                                                    {result.dnf ? "DNF" : result.dsq ? "DSQ" : `P${result.position}`}
                                                </Badge>
                                                <div
                                                    className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs"
                                                    style={{ backgroundColor: result.driver?.team?.color || '#666' }}
                                                >
                                                    {result.driver?.driver_number}
                                                </div>
                                                <span className="text-sm font-medium">{result.driver?.first_name} {result.driver?.last_name}</span>
                                            </div>
                                            <Badge variant={resultInfo && resultInfo.points >= 0 ? "secondary" : "destructive"}>
                                                {resultInfo ? (resultInfo.points > 0 ? "+" : "") + resultInfo.points : 0} pts
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : picks && picks.length > 0 ? (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {/* Group by user */}
                                {Object.entries(
                                    picks.reduce((acc, pick) => {
                                        const name = pick.profile?.display_name || "Unknown";
                                        if (!acc[name]) acc[name] = [];
                                        acc[name].push(pick);
                                        return acc;
                                    }, {} as Record<string, typeof picks>)
                                ).map(([userName, userPicks]) => (
                                    <div key={userName} className="rounded-md border p-3">
                                        <p className="font-medium text-sm mb-2">{userName}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {userPicks.map((pick: typeof picks[0]) => (
                                                <div key={pick.id} className="flex items-center gap-1">
                                                    <div
                                                        className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs"
                                                        style={{ backgroundColor: pick.driver?.team?.color || '#666' }}
                                                    >
                                                        {pick.driver?.driver_number}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {pick.driver?.last_name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No data available yet
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Sweepstake Results - Show when race is finalized */}
            {race.results_finalized && sweepstakeResults.length > 0 && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5" />
                            Sweepstake Results
                        </CardTitle>
                        <CardDescription>
                            Player standings for this race
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {sweepstakeResults.map((entry, index) => (
                                <div key={entry.displayName} className="flex items-center justify-between rounded-md border p-3">
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant="outline"
                                            className={`w-8 justify-center shrink-0 ${index === 0 ? "bg-yellow-500 text-white border-yellow-600" :
                                                index === 1 ? "bg-gray-400 text-white border-gray-500" :
                                                    index === 2 ? "bg-amber-700 text-white border-amber-800" : ""
                                                }`}
                                        >
                                            {index + 1}
                                        </Badge>
                                        <span className="font-medium min-w-24">{entry.displayName}</span>
                                        <div className="flex flex-wrap gap-2">
                                            {entry.picks.map((pick) => (
                                                <div key={pick.id} className="flex items-center gap-1">
                                                    <div
                                                        className="w-5 h-5 rounded flex items-center justify-center text-white font-bold text-xs"
                                                        style={{ backgroundColor: pick.driver?.team?.color || '#666' }}
                                                    >
                                                        {pick.driver?.driver_number}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {pick.driver?.last_name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <Badge variant={entry.totalPoints >= 0 ? "default" : "destructive"} className="text-base px-3 py-1">
                                        {entry.totalPoints > 0 ? "+" : ""}{entry.totalPoints} pts
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
