"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { findAmbiguousSeatDrivers } from "@/lib/scoring";
import { Race, Driver, RaceResult, DriverSubstitutionWithDrivers } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight, Trash2, AlertCircle, Loader2 } from "lucide-react";

interface SubstitutionsManagerProps {
    race: Race;
    substitutions: DriverSubstitutionWithDrivers[];
    drivers: (Driver & { team: { name: string; color: string } })[];
    existingResults: RaceResult[];
}

export function SubstitutionsManager({
    race,
    substitutions,
    drivers,
    existingResults,
}: SubstitutionsManagerProps) {
    const router = useRouter();
    const supabase = createClient();
    const [isPending, startTransition] = useTransition();

    const [seatDriverId, setSeatDriverId] = useState<string>("");
    const [substituteDriverId, setSubstituteDriverId] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    const driverLabel = (d: Driver & { team: { name: string } }) =>
        `${d.first_name} ${d.last_name} (${d.team.name})`;

    // Drivers already involved in a substitution for this race
    const usedSeatIds = new Set(substitutions.map(s => s.seat_driver_id));
    const usedSubstituteIds = new Set(substitutions.map(s => s.substitute_driver_id));

    // Inconsistency warning: a seat driver whose own result row would survive
    // resolution (chained swaps, where the seat driver drove another seat, are fine)
    const ambiguousSeatIds = new Set(findAmbiguousSeatDrivers(existingResults, substitutions));
    const conflictingSubs = substitutions.filter(s => ambiguousSeatIds.has(s.seat_driver_id));

    const handleAdd = () => {
        if (!seatDriverId || !substituteDriverId) return;
        setError(null);
        startTransition(async () => {
            const { error: insertError } = await supabase
                .from("driver_substitutions")
                .insert({
                    race_id: race.id,
                    seat_driver_id: seatDriverId,
                    substitute_driver_id: substituteDriverId,
                });
            if (insertError) {
                setError(insertError.message);
                return;
            }
            setSeatDriverId("");
            setSubstituteDriverId("");
            router.refresh();
        });
    };

    const handleDelete = (id: string) => {
        setError(null);
        startTransition(async () => {
            const { error: deleteError } = await supabase
                .from("driver_substitutions")
                .delete()
                .eq("id", id);
            if (deleteError) {
                setError(deleteError.message);
                return;
            }
            router.refresh();
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5" />
                    Substitutions
                </CardTitle>
                <CardDescription>
                    Record who actually drove a seat. The player who drafted the seat&apos;s
                    regular driver scores the substitute&apos;s result.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {conflictingSubs.length > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {conflictingSubs
                                .map(s => `${s.seat_driver.first_name} ${s.seat_driver.last_name}`)
                                .join(", ")}{" "}
                            has a substitution recorded but also has a result row of their own.
                            Remove one of the two — otherwise scoring is ambiguous.
                        </AlertDescription>
                    </Alert>
                )}

                {substitutions.length > 0 ? (
                    <div className="space-y-2">
                        {substitutions.map(sub => (
                            <div key={sub.id} className="flex items-center justify-between rounded-md border p-3">
                                <span className="text-sm">
                                    <span className="font-medium">
                                        {sub.substitute_driver.first_name} {sub.substitute_driver.last_name}
                                    </span>{" "}
                                    driving for{" "}
                                    <span className="font-medium">
                                        {sub.seat_driver.first_name} {sub.seat_driver.last_name}
                                    </span>
                                </span>
                                {!race.results_finalized && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(sub.id)}
                                        disabled={isPending}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No substitutions recorded for this race.
                    </p>
                )}

                {!race.results_finalized && (
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="flex-1 min-w-48">
                            <Select value={seatDriverId} onValueChange={setSeatDriverId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seat (original driver)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {drivers
                                        .filter(d => !usedSeatIds.has(d.id) && d.id !== substituteDriverId)
                                        .map(d => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {driverLabel(d)}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 min-w-48">
                            <Select value={substituteDriverId} onValueChange={setSubstituteDriverId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Substitute driver" />
                                </SelectTrigger>
                                <SelectContent>
                                    {drivers
                                        .filter(d => !usedSubstituteIds.has(d.id) && d.id !== seatDriverId)
                                        .map(d => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {driverLabel(d)}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={handleAdd}
                            disabled={isPending || !seatDriverId || !substituteDriverId}
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
