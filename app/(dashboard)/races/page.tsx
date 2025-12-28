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

                    // Determine status
                    let status: 'completed' | 'drafting' | 'pending' | 'upcoming';
                    let statusLabel: string;
                    let statusColor: string;
                    let borderColor: string;
                    let statusDescription: string;

                    if (race.results_finalized) {
                        status = 'completed';
                        statusLabel = 'Completed';
                        statusColor = 'bg-gray-500';
                        borderColor = 'border-l-gray-500';
                        statusDescription = 'Results finalized';
                    } else if (race.picks_open) {
                        status = 'drafting';
                        statusLabel = 'Draft Open';
                        statusColor = 'bg-green-600';
                        borderColor = 'border-l-green-600';
                        statusDescription = 'Make your picks now!';
                    } else if (isPast) {
                        status = 'pending';
                        statusLabel = 'Awaiting Results';
                        statusColor = 'bg-yellow-600';
                        borderColor = 'border-l-yellow-600';
                        statusDescription = 'Race complete, results pending';
                    } else {
                        status = 'upcoming';
                        statusLabel = 'Upcoming';
                        statusColor = 'bg-blue-500';
                        borderColor = 'border-l-blue-500';
                        statusDescription = `Race day: ${format(raceDate, "MMM d")}`;
                    }

                    return (
                        <Link key={race.id} href={`/races/${race.id}`}>
                            <Card className={`h-full hover:bg-accent/50 transition-colors cursor-pointer border-l-4 ${borderColor}`}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline">
                                            Round {race.round_number}
                                        </Badge>
                                        <Badge className={statusColor}>
                                            {statusLabel}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-lg mt-2">{race.name}</CardTitle>
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
                                    <p className={`text-xs mt-3 font-medium ${status === 'drafting' ? 'text-green-600' : status === 'pending' ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                                        {statusDescription}
                                    </p>
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
