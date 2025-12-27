/**
 * Scoring Logic for F1 Sweepstakes
 * 
 * Calculates points based on driver finishing positions and the season's point mapping.
 */

import type { PointMapping, RaceResult, Pick, PickWithDetails } from '@/lib/types/database';

/**
 * Get points for a specific finishing position
 * 
 * @param position - The finishing position (null if not classified)
 * @param pointMappings - The position-to-points mapping for the season
 * @param dnf - Whether the driver did not finish
 * @param dsq - Whether the driver was disqualified
 * @param dnfPoints - Points awarded for DNF (from season config)
 * @param dsqPoints - Points awarded for DSQ (from season config)
 */
export function getPointsForPosition(
    position: number | null,
    pointMappings: PointMapping[],
    dnf: boolean = false,
    dsq: boolean = false,
    dnfPoints: number = -5,
    dsqPoints: number = -5
): number {
    // DSQ drivers get the configured DSQ points
    if (dsq) {
        return dsqPoints;
    }

    // DNF drivers get the configured DNF points
    if (dnf) {
        return dnfPoints;
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
    pointMappings: PointMapping[],
    dnfPoints: number = -5,
    dsqPoints: number = -5
): number {
    let totalPoints = 0;

    for (const pick of picks) {
        const result = raceResults.find(r => r.driver_id === pick.driver_id);
        if (result) {
            totalPoints += getPointsForPosition(
                result.position,
                pointMappings,
                result.dnf,
                result.dsq,
                dnfPoints,
                dsqPoints
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
    pointMappings: PointMapping[],
    dnfPoints: number = -5,
    dsqPoints: number = -5
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
        points: calculateRacePoints(data.picks, raceResults, pointMappings, dnfPoints, dsqPoints),
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
