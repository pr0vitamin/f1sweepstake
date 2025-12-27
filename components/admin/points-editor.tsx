"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PointMapping, Season } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Plus, Minus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Standard F1 points system (20 positions)
const DEFAULT_POINTS = [
    { position: 1, points: 25 },
    { position: 2, points: 18 },
    { position: 3, points: 15 },
    { position: 4, points: 12 },
    { position: 5, points: 10 },
    { position: 6, points: 8 },
    { position: 7, points: 6 },
    { position: 8, points: 5 },
    { position: 9, points: 4 },
    { position: 10, points: 2 },
    { position: 11, points: 1 },
    { position: 12, points: 0 },
    { position: 13, points: 0 },
    { position: 14, points: 0 },
    { position: 15, points: 0 },
    { position: 16, points: -2 },
    { position: 17, points: -3 },
    { position: 18, points: -4 },
    { position: 19, points: -5 },
    { position: 20, points: -6 },
];

interface PointsEditorProps {
    season: Season;
    pointMappings: PointMapping[];
    isEditable: boolean;
}

type EditableMapping = { position: number; points: number };

export function PointsEditor({ season, pointMappings, isEditable }: PointsEditorProps) {
    const router = useRouter();
    const supabase = createClient();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Convert existing mappings to editable format
    const initialMappings: EditableMapping[] = pointMappings.length > 0
        ? pointMappings.map(m => ({ position: m.position, points: m.points }))
        : DEFAULT_POINTS;

    const [mappings, setMappings] = useState<EditableMapping[]>(initialMappings);
    const [dnfPoints, setDnfPoints] = useState<number>(season.dnf_points ?? -5);
    const [dsqPoints, setDsqPoints] = useState<number>(season.dsq_points ?? -5);
    const [hasChanges, setHasChanges] = useState(false);

    const handlePointChange = (position: number, value: string) => {
        const points = parseInt(value, 10) || 0;
        setMappings(prev =>
            prev.map(m => m.position === position ? { ...m, points } : m)
        );
        setHasChanges(true);
        setSuccess(false);
    };

    const handleAddPosition = () => {
        const maxPosition = Math.max(...mappings.map(m => m.position), 0);
        setMappings(prev => [...prev, { position: maxPosition + 1, points: 0 }]);
        setHasChanges(true);
    };

    const handleRemovePosition = () => {
        if (mappings.length <= 1) return; // Keep at least 1 position
        setMappings(prev => prev.slice(0, -1)); // Remove last position
        setHasChanges(true);
        setSuccess(false);
    };

    const handleDnfPointsChange = (value: string) => {
        setDnfPoints(parseInt(value, 10) || 0);
        setHasChanges(true);
        setSuccess(false);
    };

    const handleDsqPointsChange = (value: string) => {
        setDsqPoints(parseInt(value, 10) || 0);
        setHasChanges(true);
        setSuccess(false);
    };

    const handleSave = async () => {
        setError(null);
        setSuccess(false);

        startTransition(async () => {
            try {
                // Update season with DNF/DSQ points
                const { error: seasonError } = await supabase
                    .from("seasons")
                    .update({ dnf_points: dnfPoints, dsq_points: dsqPoints })
                    .eq("id", season.id);

                if (seasonError) throw seasonError;

                // Delete existing mappings for this season
                const { error: deleteError } = await supabase
                    .from("point_mappings")
                    .delete()
                    .eq("season_id", season.id);

                if (deleteError) throw deleteError;

                // Insert new mappings
                const { error: insertError } = await supabase
                    .from("point_mappings")
                    .insert(
                        mappings.map(m => ({
                            season_id: season.id,
                            position: m.position,
                            points: m.points,
                        }))
                    );

                if (insertError) throw insertError;

                setSuccess(true);
                setHasChanges(false);
                router.refresh();
            } catch (err: any) {
                setError(err.message || "Failed to save point mappings");
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Position Points</CardTitle>
                <CardDescription>
                    {isEditable
                        ? "Set the points awarded for each finishing position"
                        : "Viewing historical season - points cannot be modified"
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert>
                        <AlertDescription>Points configuration saved successfully!</AlertDescription>
                    </Alert>
                )}

                {/* DNF/DSQ Points Section */}
                <div className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-3">DNF / DSQ Penalties</h4>
                    <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-2">
                            <Label className="w-24">DNF Points:</Label>
                            <Input
                                type="number"
                                value={dnfPoints}
                                onChange={(e) => handleDnfPointsChange(e.target.value)}
                                disabled={!isEditable || isPending}
                                className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">Did Not Finish</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="w-24">DSQ Points:</Label>
                            <Input
                                type="number"
                                value={dsqPoints}
                                onChange={(e) => handleDsqPointsChange(e.target.value)}
                                disabled={!isEditable || isPending}
                                className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">Disqualified</span>
                        </div>
                    </div>
                </div>

                {/* Position Points Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {mappings.map((mapping) => (
                        <div key={mapping.position} className="flex items-center gap-2">
                            <Label className="w-8 text-right text-muted-foreground">
                                P{mapping.position}
                            </Label>
                            <Input
                                type="number"
                                value={mapping.points}
                                onChange={(e) => handlePointChange(mapping.position, e.target.value)}
                                disabled={!isEditable || isPending}
                                className="w-20"
                            />
                        </div>
                    ))}
                </div>

                {isEditable && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddPosition}
                            disabled={isPending}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Position
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemovePosition}
                            disabled={isPending || mappings.length <= 1}
                        >
                            <Minus className="mr-2 h-4 w-4" />
                            Remove Position
                        </Button>
                        <div className="flex-1" />
                        <Button
                            onClick={handleSave}
                            disabled={isPending || !hasChanges}
                        >
                            {isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
