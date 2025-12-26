import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Flag, MapPin, Calendar } from "lucide-react";

export default async function RacesPage() {
    const supabase = await createClient();

    // Get current season
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

    // Get all races for the season
    const { data: races } = await supabase
        .from("races")
        .select("*")
        .eq("season_id", season.id)
        .order("round_number");

    return (
        <div className="container py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Flag className="h-8 w-8" />
                    {season.year} Race Calendar
                </h1>
                <p className="text-muted-foreground mt-1">
                    {races?.length || 0} races this season
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {races?.map(race => {
                    const raceDate = parseISO(race.race_date);
                    const isPast = raceDate < new Date();

                    return (
                        <Link key={race.id} href={`/races/${race.id}`}>
                            <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="mb-2">
                                            Round {race.round_number}
                                        </Badge>
                                        {race.results_finalized ? (
                                            <Badge variant="secondary">Completed</Badge>
                                        ) : race.picks_open ? (
                                            <Badge className="bg-green-600">Picks Open</Badge>
                                        ) : isPast ? (
                                            <Badge variant="outline">Pending Results</Badge>
                                        ) : null}
                                    </div>
                                    <CardTitle className="text-lg">{race.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            {race.location}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            {format(raceDate, "MMMM d, yyyy")}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            {(!races || races.length === 0) && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Flag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                            No races scheduled yet for this season.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
