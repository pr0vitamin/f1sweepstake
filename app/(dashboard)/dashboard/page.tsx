import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Trophy, Flag, LayoutGrid, Users, Car, Calendar, CheckCircle } from "lucide-react";

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

    // Fetch active race (picks open)
    const { data: activeRace } = await supabase
        .from("races")
        .select("*")
        .eq("picks_open", true)
        .single();

    // Fetch upcoming races
    const { data: upcomingRaces } = await supabase
        .from("races")
        .select("*")
        .gte("race_date", new Date().toISOString().split('T')[0])
        .order("race_date", { ascending: true })
        .limit(3);

    // Season stats (only if current season exists)
    let stats = { users: 0, teams: 0, drivers: 0, races: 0, completedRaces: 0 };
    if (currentSeason) {
        const [usersRes, teamsRes, driversRes, racesRes, completedRes] = await Promise.all([
            supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
            supabase.from("teams").select("*", { count: "exact", head: true }).eq("season_id", currentSeason.id).eq("is_active", true),
            supabase.from("drivers").select("*, team:teams!inner(season_id)", { count: "exact", head: true }).eq("team.season_id", currentSeason.id).eq("is_active", true),
            supabase.from("races").select("*", { count: "exact", head: true }).eq("season_id", currentSeason.id),
            supabase.from("races").select("*", { count: "exact", head: true }).eq("season_id", currentSeason.id).eq("results_finalized", true),
        ]);
        stats = {
            users: usersRes.count ?? 0,
            teams: teamsRes.count ?? 0,
            drivers: driversRes.count ?? 0,
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

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Players</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.users}</div>
                        <p className="text-xs text-muted-foreground">Competing this season</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Teams</CardTitle>
                        <Flag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.teams}</div>
                        <p className="text-xs text-muted-foreground">F1 teams on the grid</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Drivers</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.drivers}</div>
                        <p className="text-xs text-muted-foreground">Available to draft</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Races</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.completedRaces} / {stats.races}</div>
                        <p className="text-xs text-muted-foreground">
                            <CheckCircle className="inline h-3 w-3 mr-1 text-green-600" />
                            Completed
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Active Draft Card */}
                <Card className={activeRace ? "border-primary" : ""}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <LayoutGrid className="h-5 w-5" />
                                Draft
                            </CardTitle>
                            {activeRace && (
                                <Badge className="bg-green-600">Live</Badge>
                            )}
                        </div>
                        <CardDescription>
                            {activeRace
                                ? `${activeRace.name} draft is open!`
                                : "No active draft right now"
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activeRace ? (
                            <Button asChild className="w-full">
                                <Link href="/draft">
                                    Go to Draft
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

                {/* Upcoming Races Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Flag className="h-5 w-5" />
                            Upcoming Races
                        </CardTitle>
                        <CardDescription>
                            Next on the calendar
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
            </div>
        </div>
    );
}
