'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
    generateRandomDraftOrder,
    generatePerformanceDraftOrder,
    DraftOrderEntry
} from "@/lib/draft-order";
import {
    calculateRacePoints,
    getPointsForPosition
} from "@/lib/scoring";
import { DriverWithTeam } from "@/lib/types/database";

export async function generateDraftOrder(raceId: string, strategy: 'random' | 'performance') {
    const supabase = await createClient();

    // 1. Fetch current race details
    const { data: race, error: raceError } = await supabase
        .from("races")
        .select("*, season:seasons(*)")
        .eq("id", raceId)
        .single();

    if (raceError || !race) throw new Error("Race not found");

    // 2. Fetch active profiles
    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true);

    if (profilesError || !profiles) throw new Error("No active profiles found");

    let draftOrder: DraftOrderEntry[] = [];

    // 3. Generate Order based on strategy
    if (strategy === 'random') {
        draftOrder = generateRandomDraftOrder(profiles);
    } else if (strategy === 'performance') {
        if (race.round_number <= 1) {
            throw new Error("Cannot use performance strategy for the first round.");
        }

        // Fetch previous race
        const { data: prevRace, error: prevRaceError } = await supabase
            .from("races")
            .select("*")
            .eq("season_id", race.season_id)
            .eq("round_number", race.round_number - 1)
            .single();

        if (prevRaceError || !prevRace) throw new Error("Previous race not found");

        // Fetch picks for previous race (with profiles)
        const { data: prevPicksRaw, error: picksError } = await supabase
            .from("picks")
            .select("*, profile:profiles(*)")
            .eq("race_id", prevRace.id);

        if (picksError) throw new Error("Could not fetch previous picks");

        // Fetch race results for previous race
        const { data: results, error: resultsError } = await supabase
            .from("race_results")
            .select("*")
            .eq("race_id", prevRace.id);

        if (resultsError) throw new Error("Could not fetch previous results");

        // Fetch point mappings
        const { data: mappings, error: pointsError } = await supabase
            .from("point_mappings")
            .select("*")
            .eq("season_id", race.season_id);

        if (pointsError) throw new Error("Could not fetch point mappings");

        // Get season points config
        const dnfPoints = (race.season as any).dnf_points ?? -5;
        const dsqPoints = (race.season as any).dsq_points ?? -5;

        // Calculate points for each user
        const playerPoints = profiles.map(profile => {
            const userPicks = prevPicksRaw.filter((p: any) => p.user_id === profile.id);
            // We need to cast picks to match scoring expectation if needed, or just map manual
            // calculateRacePoints expects Pick[] and returns total number
            const points = calculateRacePoints(userPicks, results, mappings, dnfPoints, dsqPoints);
            return {
                profile,
                previousRacePoints: points
            };
        });

        draftOrder = generatePerformanceDraftOrder(playerPoints);
    }

    // 4. Save to DB
    const { error: updateError } = await supabase
        .from("races")
        .update({ draft_order: draftOrder })
        .eq("id", raceId);

    if (updateError) throw updateError;

    revalidatePath(`/admin/races/${raceId}/draft`);
    return { success: true, draftOrder };
}

export async function clearDraftOrder(raceId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("races")
        .update({ draft_order: null })
        .eq("id", raceId);

    if (error) throw error;

    revalidatePath(`/admin/races/${raceId}/draft`);
    return { success: true };
}
