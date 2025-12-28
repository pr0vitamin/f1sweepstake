import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { Users, Flag, Car, Trophy, Calendar, CheckCircle } from "lucide-react";

export default async function AdminDashboardPage() {
    const supabase = await createClient();

    // Fetch current season
    const { data: currentSeason } = await supabase
        .from("seasons")
        .select("*")
        .eq("is_current", true)
        .single();

    if (!currentSeason) {
        return (
            <div className="flex-1 space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-muted-foreground">
                            No current season set. Please create a season and mark it as current.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Fetch season-scoped stats
    const { count: activeUserCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

    const { count: teamCount } = await supabase
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("season_id", currentSeason.id);

    const { count: activeTeamCount } = await supabase
        .from("teams")
        .select("*", { count: "exact", head: true })
        .eq("season_id", currentSeason.id)
        .eq("is_active", true);

    const { count: driverCount } = await supabase
        .from("drivers")
        .select("*, team:teams!inner(season_id)", { count: "exact", head: true })
        .eq("team.season_id", currentSeason.id);

    const { count: activeDriverCount } = await supabase
        .from("drivers")
        .select("*, team:teams!inner(season_id)", { count: "exact", head: true })
        .eq("team.season_id", currentSeason.id)
        .eq("is_active", true);

    const { count: raceCount } = await supabase
        .from("races")
        .select("*", { count: "exact", head: true })
        .eq("season_id", currentSeason.id);

    const { count: completedRaceCount } = await supabase
        .from("races")
        .select("*", { count: "exact", head: true })
        .eq("season_id", currentSeason.id)
        .eq("results_finalized", true);

    return (
        <div className="flex-1 space-y-6">
            {/* Season Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">
                        Overview for the current season
                    </p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                    <Calendar className="mr-2 h-5 w-5" />
                    {currentSeason.year} Season
                </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeUserCount ?? 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Players in the sweepstake
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Teams</CardTitle>
                        <Flag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeTeamCount ?? 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {teamCount !== activeTeamCount && (
                                <>{teamCount ?? 0} total, </>
                            )}
                            Active teams
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Drivers</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeDriverCount ?? 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {driverCount !== activeDriverCount && (
                                <>{driverCount ?? 0} total, </>
                            )}
                            Active drivers
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Races</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {completedRaceCount ?? 0} / {raceCount ?? 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            <CheckCircle className="inline h-3 w-3 mr-1 text-green-600" />
                            Completed races
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
