"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateUser(
    userId: string,
    updates: { is_active?: boolean; is_admin?: boolean; display_name?: string }
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/users");
    return { success: true };
}

export async function copyUserPoints(
    sourceUserId: string,
    targetUserId: string,
    seasonId: string
): Promise<{ success: boolean; error?: string; copiedCount?: number }> {
    const supabase = await createClient();

    // Get all races for the season
    const { data: races, error: racesError } = await supabase
        .from("races")
        .select("id")
        .eq("season_id", seasonId);

    if (racesError) {
        return { success: false, error: racesError.message };
    }

    if (!races || races.length === 0) {
        return { success: false, error: "No races found for this season" };
    }

    const raceIds = races.map(r => r.id);

    // Get source user's picks for the season's races
    const { data: sourcePicks, error: picksError } = await supabase
        .from("picks")
        .select("*")
        .eq("user_id", sourceUserId)
        .in("race_id", raceIds);

    if (picksError) {
        return { success: false, error: picksError.message };
    }

    if (!sourcePicks || sourcePicks.length === 0) {
        return { success: false, error: "Source user has no picks for this season" };
    }

    // Delete any existing picks for the target user in these races
    await supabase
        .from("picks")
        .delete()
        .eq("user_id", targetUserId)
        .in("race_id", raceIds);

    // Copy picks to target user
    const newPicks = sourcePicks.map(pick => ({
        race_id: pick.race_id,
        user_id: targetUserId,
        driver_id: pick.driver_id,
        draft_round: pick.draft_round,
        draft_pick_number: pick.draft_pick_number,
    }));

    const { error: insertError } = await supabase
        .from("picks")
        .insert(newPicks);

    if (insertError) {
        return { success: false, error: insertError.message };
    }

    revalidatePath("/admin/users");
    return { success: true, copiedCount: newPicks.length };
}
