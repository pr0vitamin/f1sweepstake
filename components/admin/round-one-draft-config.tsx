"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { generateDraftOrder, clearDraftOrder } from "@/app/admin/races/[id]/draft/actions";
import { DraftOrderEntry } from "@/lib/draft-order";
import { Loader2, Trash, Shuffle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { createNotificationForAll } from "@/app/(dashboard)/notifications/actions";
import { format, parseISO } from "date-fns";

interface RoundOneDraftConfigProps {
    raceId: string;
    raceName: string;
    raceDate: string;
    initialDraftOrder: DraftOrderEntry[] | null;
}

export function RoundOneDraftConfig({ raceId, raceName, raceDate, initialDraftOrder }: RoundOneDraftConfigProps) {
    const [draftOrder, setDraftOrder] = useState<DraftOrderEntry[] | null>(initialDraftOrder);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleGenerate = async () => {
        if (draftOrder && !confirm("This will regenerate the draft order and notify all users. Continue?")) return;

        setIsLoading(true);
        try {
            const result = await generateDraftOrder(raceId, 'random');
            if (result.success) {
                setDraftOrder(result.draftOrder);

                // Also open the draft
                await supabase
                    .from("races")
                    .update({ picks_open: true })
                    .eq("id", raceId);

                // Send notification to all users
                const formattedDate = format(parseISO(raceDate), "MMMM d");
                await createNotificationForAll(
                    "race_upcoming",
                    `Draft Open: ${raceName}`,
                    `The next race is ${raceName} and drafting is now open! Make sure to get your picks done by ${formattedDate}`,
                    { race_id: raceId, race_name: raceName }
                );

                router.refresh();
            }
        } catch (error) {
            console.error(error);
            alert("Failed to generate draft order");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = async () => {
        if (!confirm("Are you sure you want to clear the draft order and close the draft?")) return;

        setIsLoading(true);
        try {
            await clearDraftOrder(raceId);
            // Also close picks
            await supabase
                .from("races")
                .update({ picks_open: false })
                .eq("id", raceId);
            setDraftOrder(null);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to clear draft order");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Draft Configuration</CardTitle>
                <CardDescription>
                    Generate a random draft order for round 1. This will also open the draft and notify all players.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        variant={draftOrder ? "outline" : "default"}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shuffle className="mr-2 h-4 w-4" />}
                        {draftOrder ? "Regenerate & Notify" : "Generate Order & Open Draft"}
                    </Button>

                    {draftOrder && (
                        <Button
                            variant="destructive"
                            onClick={handleClear}
                            disabled={isLoading}
                        >
                            <Trash className="mr-2 h-4 w-4" />
                            Clear & Close
                        </Button>
                    )}
                </div>

                {draftOrder ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">Round 1 (Ascending)</h4>
                            {draftOrder
                                .filter(item => item.draftRound === 1)
                                .sort((a, b) => a.pickOrder - b.pickOrder)
                                .map((slot) => (
                                    <div key={slot.userId} className="flex items-center gap-3 rounded-md border p-2">
                                        <Badge variant="outline" className="w-6 justify-center text-xs">
                                            {slot.pickOrder}
                                        </Badge>
                                        <span className="text-sm">{slot.displayName}</span>
                                    </div>
                                ))}
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">Round 2 (Snake / Reverse)</h4>
                            {draftOrder
                                .filter(item => item.draftRound === 2)
                                .sort((a, b) => a.pickOrder - b.pickOrder)
                                .map((slot) => (
                                    <div key={slot.userId} className="flex items-center gap-3 rounded-md border p-2">
                                        <Badge variant="outline" className="w-6 justify-center text-xs">
                                            {slot.pickOrder}
                                        </Badge>
                                        <span className="text-sm">{slot.displayName}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
                        <p className="text-sm text-muted-foreground">No draft order generated yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
