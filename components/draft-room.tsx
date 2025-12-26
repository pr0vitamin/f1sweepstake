"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { makePick, updatePick } from "@/app/(dashboard)/draft/actions";
import { DraftOrderEntry, getCurrentPickSlot, canEditPick, formatDraftOrderForTeams } from "@/lib/draft-order";
import { DriverWithTeam, Pick, Profile } from "@/lib/types/database";
import { Loader2, Check, Copy, Clock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DraftRoomProps {
    raceId: string;
    raceName: string;
    draftOrder: DraftOrderEntry[];
    initialPicks: (Pick & { driver: DriverWithTeam })[];
    availableDrivers: DriverWithTeam[];
    currentUserId: string;
}

export function DraftRoom({
    raceId,
    raceName,
    draftOrder,
    initialPicks,
    availableDrivers,
    currentUserId
}: DraftRoomProps) {
    const [picks, setPicks] = useState(initialPicks);
    const [drivers, setDrivers] = useState(availableDrivers);
    const [isPending, startTransition] = useTransition();
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Derive state
    const completedPicks = picks.map(p => ({
        userId: p.user_id,
        draftRound: p.draft_round as 1 | 2,
        pickOrder: p.pick_order
    }));

    const currentSlot = getCurrentPickSlot(draftOrder, completedPicks);
    const isMyTurn = currentSlot?.userId === currentUserId;
    const isDraftComplete = currentSlot === null;

    // Get drivers that haven't been picked
    const pickedDriverIds = new Set(picks.map(p => p.driver_id));
    const unpickedDrivers = drivers.filter(d => !pickedDriverIds.has(d.id));

    // Real-time subscription
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`draft-${raceId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'picks',
                    filter: `race_id=eq.${raceId}`
                },
                async () => {
                    // Refetch picks on any change
                    const { data } = await supabase
                        .from("picks")
                        .select("*, driver:drivers(*, team:teams(*))")
                        .eq("race_id", raceId)
                        .order("pick_order");

                    if (data) {
                        setPicks(data as any);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [raceId]);

    const handlePick = (driverId: string) => {
        setError(null);
        startTransition(async () => {
            try {
                await makePick(raceId, driverId);
            } catch (e: any) {
                setError(e.message || "Failed to make pick");
            }
        });
    };

    const handleCopyOrder = () => {
        const text = formatDraftOrderForTeams(draftOrder, completedPicks);
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Group picks by round for display
    const round1Picks = picks.filter(p => p.draft_round === 1).sort((a, b) => a.pick_order - b.pick_order);
    const round2Picks = picks.filter(p => p.draft_round === 2).sort((a, b) => a.pick_order - b.pick_order);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{raceName} Draft</h1>
                    {isDraftComplete ? (
                        <Badge variant="secondary" className="mt-1">
                            <Check className="mr-1 h-3 w-3" /> Draft Complete
                        </Badge>
                    ) : isMyTurn ? (
                        <Badge className="mt-1 bg-green-600">
                            <AlertCircle className="mr-1 h-3 w-3" /> Your Turn!
                        </Badge>
                    ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                            <Clock className="inline mr-1 h-3 w-3" />
                            Waiting for {currentSlot?.displayName}...
                        </p>
                    )}
                </div>
                <Button variant="outline" onClick={handleCopyOrder} size="sm">
                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? "Copied!" : "Copy for Teams"}
                </Button>
            </div>

            {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-destructive text-sm">
                    {error}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Driver Selection */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Available Drivers</CardTitle>
                        <CardDescription>
                            {isMyTurn ? "Select a driver to pick" : "Waiting for your turn..."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {unpickedDrivers.map(driver => (
                                <button
                                    key={driver.id}
                                    onClick={() => handlePick(driver.id)}
                                    disabled={!isMyTurn || isPending}
                                    className="flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div
                                        className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                        style={{ backgroundColor: driver.team?.color || '#333' }}
                                    >
                                        {driver.driver_number}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{driver.first_name} {driver.last_name}</p>
                                        <p className="text-xs text-muted-foreground">{driver.team?.name}</p>
                                    </div>
                                    {isPending && isMyTurn && (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                </button>
                            ))}
                            {unpickedDrivers.length === 0 && (
                                <p className="col-span-2 text-center text-muted-foreground py-8">
                                    All drivers have been picked!
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Draft Progress */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Round 1</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {draftOrder
                                .filter(s => s.draftRound === 1)
                                .sort((a, b) => a.pickOrder - b.pickOrder)
                                .map(slot => {
                                    const pick = round1Picks.find(p => p.user_id === slot.userId);
                                    const isCurrentPick = currentSlot?.userId === slot.userId && currentSlot?.draftRound === 1;

                                    return (
                                        <div
                                            key={slot.userId}
                                            className={`flex items-center gap-2 rounded-md p-2 text-sm ${isCurrentPick ? 'bg-primary/10 ring-1 ring-primary' : ''
                                                }`}
                                        >
                                            <Badge variant="outline" className="w-6 justify-center">
                                                {slot.pickOrder}
                                            </Badge>
                                            <span className={`flex-1 ${slot.userId === currentUserId ? 'font-medium' : ''}`}>
                                                {slot.displayName}
                                            </span>
                                            {pick ? (
                                                <Badge
                                                    style={{ backgroundColor: pick.driver?.team?.color }}
                                                    className="text-white"
                                                >
                                                    {pick.driver?.abbreviation}
                                                </Badge>
                                            ) : isCurrentPick ? (
                                                <Badge variant="secondary">Picking...</Badge>
                                            ) : null}
                                        </div>
                                    );
                                })}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Round 2 (Snake)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {draftOrder
                                .filter(s => s.draftRound === 2)
                                .sort((a, b) => a.pickOrder - b.pickOrder)
                                .map(slot => {
                                    const pick = round2Picks.find(p => p.user_id === slot.userId);
                                    const isCurrentPick = currentSlot?.userId === slot.userId && currentSlot?.draftRound === 2;

                                    return (
                                        <div
                                            key={slot.userId}
                                            className={`flex items-center gap-2 rounded-md p-2 text-sm ${isCurrentPick ? 'bg-primary/10 ring-1 ring-primary' : ''
                                                }`}
                                        >
                                            <Badge variant="outline" className="w-6 justify-center">
                                                {slot.pickOrder}
                                            </Badge>
                                            <span className={`flex-1 ${slot.userId === currentUserId ? 'font-medium' : ''}`}>
                                                {slot.displayName}
                                            </span>
                                            {pick ? (
                                                <Badge
                                                    style={{ backgroundColor: pick.driver?.team?.color }}
                                                    className="text-white"
                                                >
                                                    {pick.driver?.abbreviation}
                                                </Badge>
                                            ) : isCurrentPick ? (
                                                <Badge variant="secondary">Picking...</Badge>
                                            ) : null}
                                        </div>
                                    );
                                })}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
