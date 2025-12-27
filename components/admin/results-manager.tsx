"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Race, Driver, RaceResult } from "@/lib/types/database";
import {
    getRaceSessions,
    getSessionResult,
    OpenF1Session,
    OpenF1SessionResult
} from "@/lib/openf1";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Download, Save, CheckCircle, AlertCircle, Trophy, Edit3 } from "lucide-react";

interface ResultsManagerProps {
    race: Race;
    seasonYear: number;
    existingResults: (RaceResult & { driver: Driver })[];
    drivers: (Driver & { team: { name: string; color: string } })[];
}

interface ImportPreviewRow {
    position: number | null;
    driverNumber: number;
    dnf: boolean;
    dsq: boolean;
    matchedDriver: (Driver & { team: { name: string; color: string } }) | null;
}

interface ManualEntryRow {
    driverId: string;
    driver: Driver & { team: { name: string; color: string } };
    position: string;
    dnf: boolean;
    dsq: boolean;
}

export function ResultsManager({
    race,
    seasonYear,
    existingResults,
    drivers
}: ResultsManagerProps) {
    const router = useRouter();
    const supabase = createClient();
    const [isPending, startTransition] = useTransition();

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Session search state
    const [sessions, setSessions] = useState<OpenF1Session[]>([]);
    const [selectedSessionKey, setSelectedSessionKey] = useState<string>("");
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);

    // Import preview state
    const [previewResults, setPreviewResults] = useState<ImportPreviewRow[]>([]);
    const [isLoadingResults, setIsLoadingResults] = useState(false);

    // Manual entry state
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualResults, setManualResults] = useState<ManualEntryRow[]>(() =>
        drivers.map(d => ({
            driverId: d.id,
            driver: d,
            position: "",
            dnf: false,
            dsq: false,
        }))
    );

    const hasResults = existingResults.length > 0;

    // Load sessions for the year
    const handleLoadSessions = async () => {
        setIsLoadingSessions(true);
        setError(null);
        try {
            const raceSessions = await getRaceSessions(seasonYear);
            setSessions(raceSessions);
        } catch (err: any) {
            setError(err.message || "Failed to load sessions from OpenF1");
        } finally {
            setIsLoadingSessions(false);
        }
    };

    // Load results for selected session
    const handleLoadResults = async () => {
        if (!selectedSessionKey) return;

        setIsLoadingResults(true);
        setError(null);
        try {
            const results = await getSessionResult(parseInt(selectedSessionKey));

            // Match drivers and sort (DNF/DSQ at bottom)
            const preview: ImportPreviewRow[] = results.map(r => ({
                position: r.position,
                driverNumber: r.driver_number,
                dnf: r.dnf,
                dsq: r.dsq,
                matchedDriver: drivers.find(d => d.driver_number === r.driver_number) || null,
            })).sort((a, b) => {
                // Put DNF/DSQ at bottom
                const aIsRetired = a.dnf || a.dsq || a.position === null;
                const bIsRetired = b.dnf || b.dsq || b.position === null;
                if (aIsRetired && !bIsRetired) return 1;
                if (!aIsRetired && bIsRetired) return -1;
                // Sort by position (null positions go to end)
                if (a.position === null && b.position === null) return 0;
                if (a.position === null) return 1;
                if (b.position === null) return -1;
                return a.position - b.position;
            });

            setPreviewResults(preview);
        } catch (err: any) {
            setError(err.message || "Failed to load results from OpenF1");
        } finally {
            setIsLoadingResults(false);
        }
    };

    // Import results to database
    const handleImportResults = async () => {
        if (previewResults.length === 0) return;

        const unmatchedCount = previewResults.filter(r => !r.matchedDriver).length;
        if (unmatchedCount > 0) {
            const confirm = window.confirm(
                `${unmatchedCount} drivers couldn't be matched and will be skipped. Continue?`
            );
            if (!confirm) return;
        }

        setError(null);
        setSuccess(false);

        startTransition(async () => {
            try {
                // Delete existing results for this race
                await supabase
                    .from("race_results")
                    .delete()
                    .eq("race_id", race.id);

                // Insert new results (only matched drivers)
                const resultsToInsert = previewResults
                    .filter(r => r.matchedDriver)
                    .map(r => ({
                        race_id: race.id,
                        driver_id: r.matchedDriver!.id,
                        position: r.position,
                        dnf: r.dnf,
                        dsq: r.dsq,
                    }));

                const { error: insertError } = await supabase
                    .from("race_results")
                    .insert(resultsToInsert);

                if (insertError) throw insertError;

                setSuccess(true);
                setPreviewResults([]);
                router.refresh();
            } catch (err: any) {
                setError(err.message || "Failed to save results");
            }
        });
    };

    // Finalize results
    const handleFinalizeResults = async () => {
        startTransition(async () => {
            try {
                const { error: updateError } = await supabase
                    .from("races")
                    .update({ results_finalized: true, picks_open: false })
                    .eq("id", race.id);

                if (updateError) throw updateError;

                setSuccess(true);
                router.refresh();
            } catch (err: any) {
                setError(err.message || "Failed to finalize results");
            }
        });
    };

    // Update manual entry row
    const updateManualRow = (driverId: string, field: keyof ManualEntryRow, value: string | boolean) => {
        setManualResults(prev =>
            prev.map(row =>
                row.driverId === driverId ? { ...row, [field]: value } : row
            )
        );
    };

    // Save manual results
    const handleSaveManualResults = async () => {
        // Validate: at least one driver must have a position or be DNF/DSQ
        const filledResults = manualResults.filter(
            r => r.position !== "" || r.dnf || r.dsq
        );

        if (filledResults.length === 0) {
            setError("Please enter at least one result");
            return;
        }

        // Validate positions
        for (const result of filledResults) {
            if (!result.dnf && !result.dsq && result.position === "") {
                setError(`Please enter a position for ${result.driver.first_name} ${result.driver.last_name} or mark as DNF/DSQ`);
                return;
            }
            if (result.position !== "" && (isNaN(parseInt(result.position)) || parseInt(result.position) < 1)) {
                setError(`Invalid position for ${result.driver.first_name} ${result.driver.last_name}`);
                return;
            }
        }

        setError(null);
        setSuccess(false);

        startTransition(async () => {
            try {
                // Delete existing results for this race
                await supabase
                    .from("race_results")
                    .delete()
                    .eq("race_id", race.id);

                // Insert new results
                const resultsToInsert = filledResults.map(r => ({
                    race_id: race.id,
                    driver_id: r.driverId,
                    position: r.dnf || r.dsq ? null : parseInt(r.position),
                    dnf: r.dnf,
                    dsq: r.dsq,
                }));

                const { error: insertError } = await supabase
                    .from("race_results")
                    .insert(resultsToInsert);

                if (insertError) throw insertError;

                setSuccess(true);
                setShowManualEntry(false);
                router.refresh();
            } catch (err: any) {
                setError(err.message || "Failed to save results");
            }
        });
    };

    return (
        <div className="space-y-6">
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>Operation completed successfully!</AlertDescription>
                </Alert>
            )}

            {/* Current Results */}
            {hasResults && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Current Results</CardTitle>
                                <CardDescription>
                                    {existingResults.length} drivers recorded
                                </CardDescription>
                            </div>
                            {!race.results_finalized && (
                                <Button
                                    onClick={handleFinalizeResults}
                                    disabled={isPending}
                                >
                                    {isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trophy className="mr-2 h-4 w-4" />
                                    )}
                                    Finalize Results
                                </Button>
                            )}
                            {race.results_finalized && (
                                <Badge variant="secondary">Finalized</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">Pos</TableHead>
                                    <TableHead>Driver</TableHead>
                                    <TableHead>Team</TableHead>
                                    <TableHead className="w-24">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {existingResults.map((result) => (
                                    <TableRow key={result.id}>
                                        <TableCell className="font-bold">
                                            {result.position !== null ? `P${result.position}` : "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            #{result.driver.driver_number} {result.driver.first_name} {result.driver.last_name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {(result.driver as any).team?.name || "Unknown"}
                                        </TableCell>
                                        <TableCell>
                                            {result.dnf && <Badge variant="destructive">DNF</Badge>}
                                            {result.dsq && <Badge variant="destructive">DSQ</Badge>}
                                            {!result.dnf && !result.dsq && <Badge variant="outline">OK</Badge>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Import from OpenF1 */}
            {!race.results_finalized && (
                <Card>
                    <CardHeader>
                        <CardTitle>Import from OpenF1</CardTitle>
                        <CardDescription>
                            Fetch race results from the OpenF1 API
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Step 1: Load sessions */}
                        {sessions.length === 0 && (
                            <Button
                                onClick={handleLoadSessions}
                                disabled={isLoadingSessions}
                            >
                                {isLoadingSessions ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                Load {seasonYear} Race Sessions
                            </Button>
                        )}

                        {/* Step 2: Select session */}
                        {sessions.length > 0 && (
                            <div className="flex items-end gap-4">
                                <div className="flex-1 space-y-2">
                                    <label className="text-sm font-medium">Select Race Session</label>
                                    <Select
                                        value={selectedSessionKey}
                                        onValueChange={setSelectedSessionKey}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a race..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sessions.map((session) => (
                                                <SelectItem
                                                    key={session.session_key}
                                                    value={session.session_key.toString()}
                                                >
                                                    {session.location} ({session.country_name})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={handleLoadResults}
                                    disabled={!selectedSessionKey || isLoadingResults}
                                >
                                    {isLoadingResults ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="mr-2 h-4 w-4" />
                                    )}
                                    Load Results
                                </Button>
                            </div>
                        )}

                        {/* Step 3: Preview and import */}
                        {previewResults.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">Preview</h4>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">
                                            {previewResults.filter(r => r.matchedDriver).length} matched
                                        </Badge>
                                        {previewResults.some(r => !r.matchedDriver) && (
                                            <Badge variant="destructive">
                                                {previewResults.filter(r => !r.matchedDriver).length} unmatched
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16">Pos</TableHead>
                                            <TableHead className="w-16">#</TableHead>
                                            <TableHead>Driver</TableHead>
                                            <TableHead className="w-24">Status</TableHead>
                                            <TableHead className="w-24">Match</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewResults.map((row, index) => (
                                            <TableRow key={`${row.driverNumber}-${index}`}>
                                                <TableCell className="font-bold">
                                                    {row.position !== null ? `P${row.position}` : "N/A"}
                                                </TableCell>
                                                <TableCell>{row.driverNumber}</TableCell>
                                                <TableCell>
                                                    {row.matchedDriver ? (
                                                        <span>
                                                            {row.matchedDriver.first_name} {row.matchedDriver.last_name}
                                                            <span className="text-muted-foreground ml-2">
                                                                ({row.matchedDriver.team.name})
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">
                                                            Unknown driver #{row.driverNumber}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {row.dnf && <Badge variant="destructive">DNF</Badge>}
                                                    {row.dsq && <Badge variant="destructive">DSQ</Badge>}
                                                    {!row.dnf && !row.dsq && <Badge variant="outline">OK</Badge>}
                                                </TableCell>
                                                <TableCell>
                                                    {row.matchedDriver ? (
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleImportResults}
                                        disabled={isPending || !previewResults.some(r => r.matchedDriver)}
                                    >
                                        {isPending ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="mr-2 h-4 w-4" />
                                        )}
                                        Import Results
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Manual Entry */}
            {!race.results_finalized && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Manual Entry</CardTitle>
                                <CardDescription>
                                    Enter race results manually
                                </CardDescription>
                            </div>
                            <Button
                                variant={showManualEntry ? "secondary" : "outline"}
                                onClick={() => setShowManualEntry(!showManualEntry)}
                            >
                                <Edit3 className="mr-2 h-4 w-4" />
                                {showManualEntry ? "Hide Form" : "Enter Manually"}
                            </Button>
                        </div>
                    </CardHeader>
                    {showManualEntry && (
                        <CardContent className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">#</TableHead>
                                        <TableHead>Driver</TableHead>
                                        <TableHead>Team</TableHead>
                                        <TableHead className="w-24">Position</TableHead>
                                        <TableHead className="w-16 text-center">DNF</TableHead>
                                        <TableHead className="w-16 text-center">DSQ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {manualResults.map((row) => (
                                        <TableRow key={row.driverId}>
                                            <TableCell className="font-mono">
                                                {row.driver.driver_number}
                                            </TableCell>
                                            <TableCell>
                                                {row.driver.first_name} {row.driver.last_name}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {row.driver.team?.name || "No Team"}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    placeholder="Pos"
                                                    className="w-16"
                                                    value={row.position}
                                                    onChange={(e) => updateManualRow(row.driverId, "position", e.target.value)}
                                                    disabled={row.dnf || row.dsq}
                                                    min={1}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={row.dnf}
                                                    onCheckedChange={(checked) => {
                                                        updateManualRow(row.driverId, "dnf", !!checked);
                                                        if (checked) updateManualRow(row.driverId, "dsq", false);
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={row.dsq}
                                                    onCheckedChange={(checked) => {
                                                        updateManualRow(row.driverId, "dsq", !!checked);
                                                        if (checked) updateManualRow(row.driverId, "dnf", false);
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="flex justify-end">
                                <Button
                                    onClick={handleSaveManualResults}
                                    disabled={isPending}
                                >
                                    {isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    Save Results
                                </Button>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Already finalized message */}
            {race.results_finalized && hasResults && (
                <Alert>
                    <Trophy className="h-4 w-4" />
                    <AlertDescription>
                        This race has been finalized. Results cannot be modified.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
