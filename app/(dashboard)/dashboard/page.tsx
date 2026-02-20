import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Trophy, Flag, LayoutGrid, Calendar } from "lucide-react";

export default async function DashboardHome() {
    const supabase = await createClient();

    // Fetch current user's profile
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

    // Fetch current season
    const { data: currentSeason } = await supabase
        .from("seasons")
        .select("*")
        .eq("is_current", true)
        .single();


    // Fetch active race (picks open) or pending race (closed but not finalized)
    let activeRace = null;
    let isPendingRace = false;

    const { data: openRaces } = await supabase
        .from("races")
        .select("*")
        .eq("picks_open", true)
        .limit(1);

    if (openRaces && openRaces.length > 0) {
        activeRace = openRaces[0];
    } else {
        // Look for pending race (closed but awaiting results)
        const { data: pendingRaces } = await supabase
            .from("races")
            .select("*")
            .eq("picks_open", false)
            .eq("results_finalized", false)
            .not("draft_order", "is", null)
            .order("race_date", { ascending: false })
            .limit(1);

        if (pendingRaces && pendingRaces.length > 0) {
            activeRace = pendingRaces[0];
            isPendingRace = true;
        }
    }

    // Fetch upcoming races
    const { data: upcomingRaces } = await supabase
        .from("races")
        .select("*")
        .gte("race_date", new Date().toISOString().split('T')[0])
        .order("race_date", { ascending: true })
        .limit(3);

    // Race stats for upcoming races card (only if current season exists)
    let stats = { races: 0, completedRaces: 0 };
    if (currentSeason) {
        const [racesRes, completedRes] = await Promise.all([
            supabase.from("races").select("*", { count: "exact", head: true }).eq("season_id", currentSeason.id),
            supabase.from("races").select("*", { count: "exact", head: true }).eq("season_id", currentSeason.id).eq("results_finalized", true),
        ]);
        stats = {
            races: racesRes.count ?? 0,
            completedRaces: completedRes.count ?? 0,
        };
    }

    return (
        <div className="container py-8">
            {/* Header with Season Badge */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome back, {profile?.display_name || 'Racer'}! 🏎️
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Here's what's happening in your sweepstakes
                    </p>
                </div>
                {currentSeason && (
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                        <Calendar className="mr-2 h-5 w-5" />
                        {currentSeason.year} Season
                    </Badge>
                )}
            </div>

            {/* Action Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Active Draft Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <LayoutGrid className="h-5 w-5" />
                                Draft
                            </CardTitle>
                            {activeRace && !isPendingRace && (
                                <Badge className="bg-green-600">Live</Badge>
                            )}
                            {activeRace && isPendingRace && (
                                <Badge variant="outline">Awaiting Results</Badge>
                            )}
                        </div>
                        <CardDescription>
                            {activeRace
                                ? isPendingRace
                                    ? `${activeRace.name} - View your picks`
                                    : `${activeRace.name} draft is open!`
                                : "No active draft right now"
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activeRace ? (
                            <Button asChild className="w-full" variant={isPendingRace ? "outline" : "default"}>
                                <Link href="/draft">
                                    {isPendingRace ? "View Draft" : "Go to Draft"}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Check back when a race weekend approaches.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Races Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Flag className="h-5 w-5" />
                            Upcoming Races
                        </CardTitle>
                        <CardDescription>
                            {stats.completedRaces}/{stats.races} completed · Next on the calendar:
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {upcomingRaces && upcomingRaces.length > 0 ? (
                            <ul className="space-y-2">
                                {upcomingRaces.map(race => (
                                    <li key={race.id} className="flex justify-between text-sm">
                                        <span className="font-medium">{race.name}</span>
                                        <span className="text-muted-foreground">
                                            {new Date(race.race_date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No upcoming races scheduled.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Leaderboard Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5" />
                            Leaderboard
                        </CardTitle>
                        <CardDescription>
                            Season standings
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/leaderboard">
                                View Standings
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
