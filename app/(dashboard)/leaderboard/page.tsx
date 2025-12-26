import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

export default async function LeaderboardPage() {
    const supabase = await createClient();

    // 1. Get current season
    const { data: season } = await supabase
        .from("seasons")
        .select("*")
        .eq("is_current", true)
        .single();

    if (!season) {
        return (
            <div className="container py-8 text-center">
                <h1 className="text-2xl font-bold">No active season</h1>
            </div>
        );
    }

    // 2. Get all finalized races for the season
    const { data: races } = await supabase
        .from("races")
        .select("id, name, round_number")
        .eq("season_id", season.id)
        .eq("results_finalized", true)
        .order("round_number");

    // 3. Get all picks with results
    const { data: picks } = await supabase
        .from("picks")
        .select(`
            *,
            profile:profiles(*),
            driver:drivers(*),
            race:races(*)
        `)
        .in("race_id", races?.map(r => r.id) || []);

    // 4. Get race results
    const { data: results } = await supabase
        .from("race_results")
        .select("*")
        .in("race_id", races?.map(r => r.id) || []);

    // 5. Get point mappings
    const { data: mappings } = await supabase
        .from("point_mappings")
        .select("*")
        .eq("season_id", season.id);

    // 6. Calculate standings (simplified for now)
    const standingsMap = new Map<string, {
        displayName: string;
        totalPoints: number;
        racesParticipated: number;
    }>();

    if (picks && results && mappings) {
        for (const pick of picks as any[]) {
            const result = results.find(r =>
                r.race_id === pick.race_id &&
                r.driver_id === pick.driver_id
            );

            if (result) {
                let points = 0;
                if (result.dsq) {
                    const worst = mappings.reduce((min, m) => m.points < min.points ? m : min, mappings[0]);
                    points = worst?.points || 0;
                } else if (result.dnf) {
                    const sorted = [...mappings].sort((a, b) => a.points - b.points);
                    points = sorted[1]?.points || sorted[0]?.points || 0;
                } else if (result.position) {
                    const mapping = mappings.find(m => m.position === result.position);
                    points = mapping?.points || 0;
                }

                const existing = standingsMap.get(pick.user_id) || {
                    displayName: pick.profile?.display_name || 'Unknown',
                    totalPoints: 0,
                    racesParticipated: 0
                };
                existing.totalPoints += points;
                existing.racesParticipated = Math.max(existing.racesParticipated,
                    picks.filter((p: any) => p.user_id === pick.user_id).length / 2); // Divide by 2 (2 picks per race)
                standingsMap.set(pick.user_id, existing);
            }
        }
    }

    const standings = Array.from(standingsMap.entries())
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.totalPoints - a.totalPoints);

    return (
        <div className="container py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    Season {season.year} Leaderboard
                </h1>
                <p className="text-muted-foreground mt-1">
                    {races?.length || 0} race{races?.length !== 1 ? 's' : ''} completed
                </p>
            </div>

            {standings.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                            No results yet. The leaderboard will update once races are finalized.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Standings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {standings.map((entry, index) => (
                                <div
                                    key={entry.userId}
                                    className={`flex items-center justify-between p-4 rounded-lg ${index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                                            index === 1 ? 'bg-slate-300/10 border border-slate-400/30' :
                                                index === 2 ? 'bg-orange-500/10 border border-orange-500/30' :
                                                    'bg-muted/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-500 text-black' :
                                                index === 1 ? 'bg-slate-400 text-black' :
                                                    index === 2 ? 'bg-orange-500 text-black' :
                                                        'bg-muted text-muted-foreground'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <span className="font-medium">{entry.displayName}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold">{entry.totalPoints}</div>
                                        <div className="text-xs text-muted-foreground">points</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
