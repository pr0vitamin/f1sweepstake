import { describe, it, expect } from 'vitest';
import {
    getPointsForPosition,
    calculateRacePoints,
    calculateRaceLeaderboard,
    calculateSeasonStandings,
} from '@/lib/scoring';
import type { PointMapping, RaceResult, Pick, PickWithDetails, Profile, Driver, Team } from '@/lib/types/database';

// Test fixtures
const mockPointMappings: PointMapping[] = [
    { id: '1', season_id: 's1', position: 1, points: 25, created_at: '' },
    { id: '2', season_id: 's1', position: 2, points: 18, created_at: '' },
    { id: '3', season_id: 's1', position: 3, points: 15, created_at: '' },
    { id: '4', season_id: 's1', position: 10, points: 1, created_at: '' },
    { id: '5', season_id: 's1', position: 15, points: 0, created_at: '' },
    { id: '6', season_id: 's1', position: 20, points: -5, created_at: '' },
    { id: '7', season_id: 's1', position: 21, points: -6, created_at: '' },
    { id: '8', season_id: 's1', position: 22, points: -7, created_at: '' },
];

const mockTeam: Team = {
    id: 't1',
    season_id: 's1',
    name: 'Red Bull',
    color: '#3671C6',
    is_active: true,
    created_at: '',
    updated_at: '',
};

const mockDriver = (id: string, number: number): Driver => ({
    id,
    team_id: 't1',
    driver_number: number,
    first_name: 'Driver',
    last_name: `${number}`,
    abbreviation: `D${number}`,
    is_active: true,
    created_at: '',
    updated_at: '',
});

const mockProfile = (id: string, name: string): Profile => ({
    id,
    email: `${name.toLowerCase()}@test.com`,
    display_name: name,
    is_admin: false,
    is_active: true,
    created_at: '',
    updated_at: '',
});

describe('getPointsForPosition', () => {
    it('returns correct points for a normal finish', () => {
        expect(getPointsForPosition(1, mockPointMappings)).toBe(25);
        expect(getPointsForPosition(2, mockPointMappings)).toBe(18);
        expect(getPointsForPosition(3, mockPointMappings)).toBe(15);
        expect(getPointsForPosition(10, mockPointMappings)).toBe(1);
    });

    it('returns 0 for positions not in mapping', () => {
        expect(getPointsForPosition(5, mockPointMappings)).toBe(0);
        expect(getPointsForPosition(12, mockPointMappings)).toBe(0);
    });

    it('returns negative points for low positions', () => {
        expect(getPointsForPosition(20, mockPointMappings)).toBe(-5);
    });

    it('returns 0 for null position', () => {
        expect(getPointsForPosition(null, mockPointMappings)).toBe(0);
    });

    it('returns worst points for DSQ', () => {
        expect(getPointsForPosition(1, mockPointMappings, false, true)).toBe(-7);
    });

    it('returns second-worst points for DNF', () => {
        expect(getPointsForPosition(1, mockPointMappings, true, false)).toBe(-6);
    });
});

describe('calculateRacePoints', () => {
    it('calculates total points for multiple picks', () => {
        const picks: Pick[] = [
            { id: 'p1', race_id: 'r1', user_id: 'u1', driver_id: 'd1', pick_order: 1, draft_round: 1, created_at: '' },
            { id: 'p2', race_id: 'r1', user_id: 'u1', driver_id: 'd2', pick_order: 2, draft_round: 2, created_at: '' },
        ];

        const raceResults: RaceResult[] = [
            { id: 'rr1', race_id: 'r1', driver_id: 'd1', position: 1, dnf: false, dsq: false, created_at: '' },
            { id: 'rr2', race_id: 'r1', driver_id: 'd2', position: 3, dnf: false, dsq: false, created_at: '' },
        ];

        const points = calculateRacePoints(picks, raceResults, mockPointMappings);
        expect(points).toBe(25 + 15); // 1st + 3rd
    });

    it('handles picks with no matching result', () => {
        const picks: Pick[] = [
            { id: 'p1', race_id: 'r1', user_id: 'u1', driver_id: 'd1', pick_order: 1, draft_round: 1, created_at: '' },
        ];

        const raceResults: RaceResult[] = []; // No results

        const points = calculateRacePoints(picks, raceResults, mockPointMappings);
        expect(points).toBe(0);
    });

    it('includes negative points for low-placing picks', () => {
        const picks: Pick[] = [
            { id: 'p1', race_id: 'r1', user_id: 'u1', driver_id: 'd1', pick_order: 1, draft_round: 1, created_at: '' },
            { id: 'p2', race_id: 'r1', user_id: 'u1', driver_id: 'd2', pick_order: 2, draft_round: 2, created_at: '' },
        ];

        const raceResults: RaceResult[] = [
            { id: 'rr1', race_id: 'r1', driver_id: 'd1', position: 1, dnf: false, dsq: false, created_at: '' },
            { id: 'rr2', race_id: 'r1', driver_id: 'd2', position: 20, dnf: false, dsq: false, created_at: '' },
        ];

        const points = calculateRacePoints(picks, raceResults, mockPointMappings);
        expect(points).toBe(25 + (-5)); // 1st + 20th
    });
});

describe('calculateRaceLeaderboard', () => {
    it('returns sorted leaderboard with correct points', () => {
        const driver1 = mockDriver('d1', 1);
        const driver2 = mockDriver('d2', 44);
        const profile1 = mockProfile('u1', 'Alice');
        const profile2 = mockProfile('u2', 'Bob');

        const allPicks: PickWithDetails[] = [
            {
                id: 'p1', race_id: 'r1', user_id: 'u1', driver_id: 'd1',
                pick_order: 1, draft_round: 1, created_at: '',
                driver: { ...driver1, team: mockTeam },
                profile: profile1,
            },
            {
                id: 'p2', race_id: 'r1', user_id: 'u2', driver_id: 'd2',
                pick_order: 2, draft_round: 1, created_at: '',
                driver: { ...driver2, team: mockTeam },
                profile: profile2,
            },
        ];

        const raceResults: RaceResult[] = [
            { id: 'rr1', race_id: 'r1', driver_id: 'd1', position: 1, dnf: false, dsq: false, created_at: '' },
            { id: 'rr2', race_id: 'r1', driver_id: 'd2', position: 10, dnf: false, dsq: false, created_at: '' },
        ];

        const leaderboard = calculateRaceLeaderboard(allPicks, raceResults, mockPointMappings);

        expect(leaderboard).toHaveLength(2);
        expect(leaderboard[0].displayName).toBe('Alice');
        expect(leaderboard[0].points).toBe(25);
        expect(leaderboard[1].displayName).toBe('Bob');
        expect(leaderboard[1].points).toBe(1);
    });
});

describe('calculateSeasonStandings', () => {
    it('aggregates points across multiple races', () => {
        const raceLeaderboards = [
            {
                raceId: 'r1',
                raceName: 'Bahrain GP',
                leaderboard: [
                    { userId: 'u1', displayName: 'Alice', points: 25 },
                    { userId: 'u2', displayName: 'Bob', points: 18 },
                ],
            },
            {
                raceId: 'r2',
                raceName: 'Saudi GP',
                leaderboard: [
                    { userId: 'u2', displayName: 'Bob', points: 25 },
                    { userId: 'u1', displayName: 'Alice', points: 15 },
                ],
            },
        ];

        const standings = calculateSeasonStandings(raceLeaderboards);

        expect(standings).toHaveLength(2);

        // Bob: 18 + 25 = 43, Alice: 25 + 15 = 40
        expect(standings[0].displayName).toBe('Bob');
        expect(standings[0].totalPoints).toBe(43);
        expect(standings[1].displayName).toBe('Alice');
        expect(standings[1].totalPoints).toBe(40);
    });

    it('tracks per-race points breakdown', () => {
        const raceLeaderboards = [
            {
                raceId: 'r1',
                raceName: 'Bahrain GP',
                leaderboard: [{ userId: 'u1', displayName: 'Alice', points: 25 }],
            },
            {
                raceId: 'r2',
                raceName: 'Saudi GP',
                leaderboard: [{ userId: 'u1', displayName: 'Alice', points: 18 }],
            },
        ];

        const standings = calculateSeasonStandings(raceLeaderboards);

        expect(standings[0].racePoints).toHaveLength(2);
        expect(standings[0].racePoints[0].raceName).toBe('Bahrain GP');
        expect(standings[0].racePoints[0].points).toBe(25);
    });
});
