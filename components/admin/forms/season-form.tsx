"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Copy } from "lucide-react";
import { Season } from "@/lib/types/database";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
    year: z.coerce.number().min(2000, "Year must be > 2000").max(2100, "Year must be < 2100"),
    is_current: z.boolean().default(false),
    copy_from_current: z.boolean().default(true),
});

interface SeasonFormProps {
    initialData?: Season;
    currentSeasonId?: string;
}

export function SeasonForm({ initialData, currentSeasonId }: SeasonFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    type FormValues = {
        year: number;
        is_current: boolean;
        copy_from_current: boolean;
    };

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            year: initialData?.year || new Date().getFullYear() + 1,
            is_current: initialData?.is_current ?? false,
            copy_from_current: !initialData && !!currentSeasonId, // Default to true for new seasons if there's a current season
        },
    });

    async function copySeasonData(supabase: ReturnType<typeof createClient>, sourceSeasonId: string, newSeasonId: string) {
        // Step 1: Copy teams
        setCopyStatus("Copying teams...");
        const { data: sourceTeams, error: teamsError } = await supabase
            .from("teams")
            .select("*")
            .eq("season_id", sourceSeasonId);

        if (teamsError) throw new Error(`Failed to fetch teams: ${teamsError.message}`);

        const teamIdMap: Record<string, string> = {}; // old team_id -> new team_id

        if (sourceTeams && sourceTeams.length > 0) {
            for (const team of sourceTeams) {
                const { data: newTeam, error: insertTeamError } = await supabase
                    .from("teams")
                    .insert({
                        season_id: newSeasonId,
                        name: team.name,
                        color: team.color,
                        is_active: team.is_active,
                    })
                    .select("id")
                    .single();

                if (insertTeamError) throw new Error(`Failed to copy team ${team.name}: ${insertTeamError.message}`);
                if (newTeam) {
                    teamIdMap[team.id] = newTeam.id;
                }
            }
        }

        // Step 2: Copy drivers (using new team IDs)
        setCopyStatus("Copying drivers...");
        const { data: sourceDrivers, error: driversError } = await supabase
            .from("drivers")
            .select("*")
            .in("team_id", Object.keys(teamIdMap));

        if (driversError) throw new Error(`Failed to fetch drivers: ${driversError.message}`);

        if (sourceDrivers && sourceDrivers.length > 0) {
            const driversToInsert = sourceDrivers.map(driver => ({
                team_id: teamIdMap[driver.team_id],
                driver_number: driver.driver_number,
                first_name: driver.first_name,
                last_name: driver.last_name,
                abbreviation: driver.abbreviation,
                is_active: driver.is_active,
            }));

            const { error: insertDriversError } = await supabase
                .from("drivers")
                .insert(driversToInsert);

            if (insertDriversError) throw new Error(`Failed to copy drivers: ${insertDriversError.message}`);
        }

        // Step 3: Copy point mappings
        setCopyStatus("Copying point mappings...");
        const { data: sourcePointMappings, error: pointsError } = await supabase
            .from("point_mappings")
            .select("*")
            .eq("season_id", sourceSeasonId);

        if (pointsError) throw new Error(`Failed to fetch point mappings: ${pointsError.message}`);

        if (sourcePointMappings && sourcePointMappings.length > 0) {
            const pointMappingsToInsert = sourcePointMappings.map(pm => ({
                season_id: newSeasonId,
                position: pm.position,
                points: pm.points,
            }));

            const { error: insertPointsError } = await supabase
                .from("point_mappings")
                .insert(pointMappingsToInsert);

            if (insertPointsError) throw new Error(`Failed to copy point mappings: ${insertPointsError.message}`);
        }

        // Step 4: Copy DNF/DSQ points from source season
        setCopyStatus("Copying season settings...");
        const { data: sourceSeason, error: sourceSeasonError } = await supabase
            .from("seasons")
            .select("dnf_points, dsq_points")
            .eq("id", sourceSeasonId)
            .single();

        if (!sourceSeasonError && sourceSeason) {
            await supabase
                .from("seasons")
                .update({
                    dnf_points: sourceSeason.dnf_points,
                    dsq_points: sourceSeason.dsq_points,
                })
                .eq("id", newSeasonId);
        }

        setCopyStatus(null);
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setCopyStatus(null);
        const supabase = createClient();

        try {
            if (initialData) {
                // Update existing season
                if (values.is_current) {
                    await supabase
                        .from("seasons")
                        .update({ is_current: false })
                        .neq("id", initialData.id);
                }

                const { error } = await supabase
                    .from("seasons")
                    .update({
                        year: values.year,
                        is_current: values.is_current,
                    })
                    .eq("id", initialData.id);

                if (error) throw error;
            } else {
                // Create new season
                if (values.is_current) {
                    await supabase
                        .from("seasons")
                        .update({ is_current: false })
                        .neq("id", "00000000-0000-0000-0000-000000000000");
                }

                const { data: newSeason, error } = await supabase
                    .from("seasons")
                    .insert({
                        year: values.year,
                        is_current: values.is_current,
                    })
                    .select("id")
                    .single();

                if (error) throw error;

                // Copy data from current season if requested
                if (values.copy_from_current && currentSeasonId && newSeason) {
                    await copySeasonData(supabase, currentSeasonId, newSeason.id);
                }
            }

            router.push("/admin/seasons");
            router.refresh();
        } catch (error: any) {
            console.error("Error saving season:", error);
            alert(`Error saving season: ${error?.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
            setCopyStatus(null);
        }
    }

    const isCreating = !initialData;
    const hasCopySource = !!currentSeasonId;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
                <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Season Year</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="is_current"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Current Season
                                </FormLabel>
                                <FormDescription>
                                    This will set this season as the active one.
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                {isCreating && hasCopySource && (
                    <FormField
                        control={form.control}
                        name="copy_from_current"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/50">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="flex items-center gap-2">
                                        <Copy className="h-4 w-4" />
                                        Copy from Current Season
                                    </FormLabel>
                                    <FormDescription>
                                        Copy all teams, drivers, and point mappings from the current season to this new season.
                                    </FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />
                )}

                {copyStatus && (
                    <Alert>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <AlertDescription>{copyStatus}</AlertDescription>
                    </Alert>
                )}

                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Update Season" : "Create Season"}
                </Button>
            </form>
        </Form>
    );
}
