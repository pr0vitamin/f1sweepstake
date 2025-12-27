"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Check if team has any drivers
    const { count: driverCount } = await supabase
        .from("drivers")
        .select("*", { count: "exact", head: true })
        .eq("team_id", teamId);

    if (driverCount && driverCount > 0) {
        return {
            success: false,
            error: `Cannot delete team with ${driverCount} driver(s). Please delete or reassign drivers first.`,
        };
    }

    const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/teams");
    return { success: true };
}

export async function deleteDriver(driverId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Check if driver has any race results
    const { count: resultsCount } = await supabase
        .from("race_results")
        .select("*", { count: "exact", head: true })
        .eq("driver_id", driverId);

    if (resultsCount && resultsCount > 0) {
        return {
            success: false,
            error: `Cannot delete driver with ${resultsCount} race result(s). Please delete race results first.`,
        };
    }

    // Check if driver has any picks
    const { count: picksCount } = await supabase
        .from("picks")
        .select("*", { count: "exact", head: true })
        .eq("driver_id", driverId);

    if (picksCount && picksCount > 0) {
        return {
            success: false,
            error: `Cannot delete driver with ${picksCount} pick(s). Historical data would be lost.`,
        };
    }

    const { error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", driverId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/drivers");
    return { success: true };
}

export async function deleteRace(raceId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Check if race has finalized results
    const { data: race } = await supabase
        .from("races")
        .select("results_finalized")
        .eq("id", raceId)
        .single();

    if (race?.results_finalized) {
        return {
            success: false,
            error: "Cannot delete a race with finalized results.",
        };
    }

    // Check if race has any picks
    const { count: picksCount } = await supabase
        .from("picks")
        .select("*", { count: "exact", head: true })
        .eq("race_id", raceId);

    if (picksCount && picksCount > 0) {
        return {
            success: false,
            error: `Cannot delete race with ${picksCount} pick(s). Players have already made selections.`,
        };
    }

    // Delete related race_results first (if any non-finalized)
    await supabase
        .from("race_results")
        .delete()
        .eq("race_id", raceId);

    const { error } = await supabase
        .from("races")
        .delete()
        .eq("id", raceId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/races");
    return { success: true };
}
