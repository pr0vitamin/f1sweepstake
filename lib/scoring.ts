/**
 * Scoring Logic for F1 Sweepstakes
 * 
 * Calculates points based on driver finishing positions and the season's point mapping.
 */

import type { PointMapping, RaceResult, Pick, PickWithDetails } from '@/lib/types/database';

/**
 * Get points for a specific finishing position
 */
export function getPointsForPosition(
    position: number | null,
    pointMappings: PointMapping[],
    dnf: boolean = false,
    dsq: boolean = false
): number {
    // DSQ drivers get worst possible points
    if (dsq) {
        const worstMapping = pointMappings.reduce((min, pm) =>
            pm.points < min.points ? pm : min
            , pointMappings[0]);
        return worstMapping?.points ?? 0;
    }

    // DNF drivers get second-worst points (or worst if only one bad position)
    if (dnf) {
        const sortedByPoints = [...pointMappings].sort((a, b) => a.points - b.points);
        return sortedByPoints[1]?.points ?? sortedByPoints[0]?.points ?? 0;
    }

    // Normal finish - look up points for position
    if (position === null) return 0;

    const mapping = pointMappings.find(pm => pm.position === position);
    return mapping?.points ?? 0;
}

/**
 * Calculate total points for a player's picks in a specific race
 */
export function calculateRacePoints(
    picks: Pick[],
    raceResults: RaceResult[],
    pointMappings: PointMapping[]
): number {
    let totalPoints = 0;

    for (const pick of picks) {
        const result = raceResults.find(r => r.driver_id === pick.driver_id);
        if (result) {
            totalPoints += getPointsForPosition(
                result.position,
                pointMappings,
                result.dnf,
                result.dsq
            );
        }
    }

    return totalPoints;
}

/**
 * Calculate points for each player in a race, returning sorted leaderboard
 */
export function calculateRaceLeaderboard(
    allPicks: PickWithDetails[],
    raceResults: RaceResult[],
    pointMappings: PointMapping[]
): { userId: string; displayName: string; points: number; picks: PickWithDetails[] }[] {
    // Group picks by user
    const picksByUser = allPicks.reduce((acc, pick) => {
        if (!acc[pick.user_id]) {
            acc[pick.user_id] = {
                displayName: pick.profile.display_name,
                picks: [],
            };
        }
        acc[pick.user_id].picks.push(pick);
        return acc;
    }, {} as Record<string, { displayName: string; picks: PickWithDetails[] }>);

    // Calculate points for each user
    const leaderboard = Object.entries(picksByUser).map(([userId, data]) => ({
        userId,
        displayName: data.displayName,
        points: calculateRacePoints(data.picks, raceResults, pointMappings),
        picks: data.picks,
    }));

    // Sort by points descending
    return leaderboard.sort((a, b) => b.points - a.points);
}

/**
 * Calculate season-wide standings across multiple races
 */
export function calculateSeasonStandings(
    raceLeaderboards: { raceId: string; raceName: string; leaderboard: { userId: string; displayName: string; points: number }[] }[]
): { userId: string; displayName: string; totalPoints: number; racePoints: { raceId: string; raceName: string; points: number }[] }[] {
    const standings: Record<string, {
        displayName: string;
        totalPoints: number;
        racePoints: { raceId: string; raceName: string; points: number }[];
    }> = {};

    for (const race of raceLeaderboards) {
        for (const entry of race.leaderboard) {
            if (!standings[entry.userId]) {
                standings[entry.userId] = {
                    displayName: entry.displayName,
                    totalPoints: 0,
                    racePoints: [],
                };
            }
            standings[entry.userId].totalPoints += entry.points;
            standings[entry.userId].racePoints.push({
                raceId: race.raceId,
                raceName: race.raceName,
                points: entry.points,
            });
        }
    }

    return Object.entries(standings)
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.totalPoints - a.totalPoints);
}
