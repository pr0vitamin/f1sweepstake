"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateDraftOrder, clearDraftOrder } from "@/app/admin/races/[id]/draft/actions";
import { DraftOrderEntry } from "@/lib/draft-order";
import { Loader2, Trash, Shuffle, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DraftConfigProps {
    raceId: string;
    roundNumber: number;
    initialDraftOrder: DraftOrderEntry[] | null;
}

export function DraftConfig({ raceId, roundNumber, initialDraftOrder }: DraftConfigProps) {
    const [draftOrder, setDraftOrder] = useState<DraftOrderEntry[] | null>(initialDraftOrder);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async (strategy: 'random' | 'performance') => {
        if (!confirm("This will overwrite any existing draft order. Continue?")) return;

        setIsLoading(true);
        try {
            const result = await generateDraftOrder(raceId, strategy);
            if (result.success) {
                setDraftOrder(result.draftOrder);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to generate draft order");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = async () => {
        if (!confirm("Are you sure you want to clear the draft order?")) return;

        setIsLoading(true);
        try {
            await clearDraftOrder(raceId);
            setDraftOrder(null);
        } catch (error) {
            console.error(error);
            alert("Failed to clear draft order");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-medium">Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                        Round {roundNumber} - Choose a strategy to set the pick order.
                    </p>
                </div>
                <div className="flex gap-2">
                    {roundNumber === 1 && (
                        <Button
                            onClick={() => handleGenerate('random')}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shuffle className="mr-2 h-4 w-4" />}
                            Randomize
                        </Button>
                    )}
                    {roundNumber > 1 && (
                        <Button
                            onClick={() => handleGenerate('performance')}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
                            From Standings
                        </Button>
                    )}
                    {draftOrder && (
                        <Button
                            variant="destructive"
                            onClick={handleClear}
                            disabled={isLoading}
                        >
                            <Trash className="mr-2 h-4 w-4" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {draftOrder ? (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Round 1 (Ascending)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {draftOrder
                                    .filter(item => item.draftRound === 1)
                                    .sort((a, b) => a.pickOrder - b.pickOrder)
                                    .map((slot) => (
                                        <div key={slot.userId} className="flex items-center justify-between rounded-md border p-3">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="w-8 justify-center">
                                                    {slot.pickOrder}
                                                </Badge>
                                                <span className="font-medium">{slot.displayName}</span>
                                            </div>
                                            {slot.previousRacePoints !== undefined && (
                                                <span className="text-xs text-muted-foreground">
                                                    {slot.previousRacePoints} pts
                                                </span>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Round 2 (Snake / Reverse)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {draftOrder
                                    .filter(item => item.draftRound === 2)
                                    .sort((a, b) => a.pickOrder - b.pickOrder)
                                    .map((slot) => (
                                        <div key={slot.userId} className="flex items-center justify-between rounded-md border p-3">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="w-8 justify-center">
                                                    {slot.pickOrder}
                                                </Badge>
                                                <span className="font-medium">{slot.displayName}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
                    <p className="text-muted-foreground">No draft order generated yet.</p>
                </div>
            )}
        </div>
    );
}
