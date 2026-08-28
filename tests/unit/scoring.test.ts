import { describe, it, expect } from 'vitest';
import {
    getPointsForPosition,
    calculateRacePoints,
    calculateRaceLeaderboard,
    calculateSeasonStandings,
    applySubstitutions,
} from '@/lib/scoring';
import type { PointMapping, RaceResult, Pick, PickWithDetails, Profile, Driver, Team, DriverSubstitution } from '@/lib/types/database';

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
    is_substitute: false,
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

    it('returns DNF points for null position (unclassified)', () => {
        expect(getPointsForPosition(null, mockPointMappings)).toBe(-5);
    });

    it('returns configured points for DSQ', () => {
        // Default DSQ points (-5)
        expect(getPointsForPosition(1, mockPointMappings, false, true)).toBe(-5);
        // Custom DSQ points
        expect(getPointsForPosition(1, mockPointMappings, false, true, false, -5, -10)).toBe(-10);
    });

    it('returns configured points for DNF', () => {
        // Default DNF points (-5)
        expect(getPointsForPosition(1, mockPointMappings, true, false)).toBe(-5);
        // Custom DNF points
        expect(getPointsForPosition(1, mockPointMappings, true, false, false, -8, -5)).toBe(-8);
    });

    it('returns configured points for DNS (same as DNF)', () => {
        // Default DNS points (same as DNF: -5)
        expect(getPointsForPosition(1, mockPointMappings, false, false, true)).toBe(-5);
        // Custom DNS points (uses dnfPoints)
        expect(getPointsForPosition(1, mockPointMappings, false, false, true, -8, -5)).toBe(-8);
    });
});

describe('calculateRacePoints', () => {
    it('calculates total points for multiple picks', () => {
        const picks: Pick[] = [
            { id: 'p1', race_id: 'r1', user_id: 'u1', driver_id: 'd1', pick_order: 1, draft_round: 1, created_at: '' },
            { id: 'p2', race_id: 'r1', user_id: 'u1', driver_id: 'd2', pick_order: 2, draft_round: 2, created_at: '' },
        ];

        const raceResults: RaceResult[] = [
            { id: 'rr1', race_id: 'r1', driver_id: 'd1', position: 1, dnf: false, dns: false, dsq: false, created_at: '' },
            { id: 'rr2', race_id: 'r1', driver_id: 'd2', position: 3, dnf: false, dns: false, dsq: false, created_at: '' },
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
            { id: 'rr1', race_id: 'r1', driver_id: 'd1', position: 1, dnf: false, dns: false, dsq: false, created_at: '' },
            { id: 'rr2', race_id: 'r1', driver_id: 'd2', position: 20, dnf: false, dns: false, dsq: false, created_at: '' },
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
            { id: 'rr1', race_id: 'r1', driver_id: 'd1', position: 1, dnf: false, dns: false, dsq: false, created_at: '' },
            { id: 'rr2', race_id: 'r1', driver_id: 'd2', position: 10, dnf: false, dns: false, dsq: false, created_at: '' },
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

// Test fixtures for applySubstitutions
const mockSub = (raceId: string, seatId: string, subId: string): DriverSubstitution => ({
    id: `sub-${seatId}-${subId}`,
    race_id: raceId,
    seat_driver_id: seatId,
    substitute_driver_id: subId,
    created_at: '',
});

const mockResult = (raceId: string, driverId: string, position: number | null, flags: Partial<RaceResult> = {}): RaceResult => ({
    id: `res-${raceId}-${driverId}`,
    race_id: raceId,
    driver_id: driverId,
    position,
    dnf: false,
    dns: false,
    dsq: false,
    created_at: '',
    ...flags,
});

describe('applySubstitutions', () => {
    it('returns results unchanged when there are no substitutions', () => {
        const results = [mockResult('r1', 'd1', 1), mockResult('r1', 'd2', 2)];
        expect(applySubstitutions(results, [])).toEqual(results);
    });

    it('re-keys a substitute result row to the seat driver', () => {
        // sub drove seat-driver d1's car and finished P4
        const results = [mockResult('r1', 'sub1', 4), mockResult('r1', 'd2', 2)];
        const subs = [mockSub('r1', 'd1', 'sub1')];

        const resolved = applySubstitutions(results, subs);

        expect(resolved.find(r => r.driver_id === 'd1')?.position).toBe(4);
        expect(resolved.find(r => r.driver_id === 'sub1')).toBeUndefined();
        expect(resolved.find(r => r.driver_id === 'd2')?.position).toBe(2);
    });

    it('preserves DNF/DNS/DSQ flags when re-keying', () => {
        const results = [mockResult('r1', 'sub1', null, { dnf: true })];
        const subs = [mockSub('r1', 'd1', 'sub1')];

        const resolved = applySubstitutions(results, subs);

        expect(resolved.find(r => r.driver_id === 'd1')?.dnf).toBe(true);
    });

    it('resolves chained substitutions in a single pass (no transitivity)', () => {
        // A subs for injured B; reserve C subs for A's old seat.
        // A finished P3, C finished P10. B's picker gets P3; A's picker gets P10.
        const results = [mockResult('r1', 'A', 3), mockResult('r1', 'C', 10)];
        const subs = [mockSub('r1', 'B', 'A'), mockSub('r1', 'A', 'C')];

        const resolved = applySubstitutions(results, subs);

        expect(resolved.find(r => r.driver_id === 'B')?.position).toBe(3);
        expect(resolved.find(r => r.driver_id === 'A')?.position).toBe(10);
        expect(resolved.find(r => r.driver_id === 'C')).toBeUndefined();
    });

    it('leaves a substitution without a matching result row inert (seat scores nothing)', () => {
        const results = [mockResult('r1', 'd2', 2)];
        const subs = [mockSub('r1', 'd1', 'sub1')]; // sub1 has no result row

        const resolved = applySubstitutions(results, subs);

        expect(resolved).toHaveLength(1);
        expect(resolved.find(r => r.driver_id === 'd1')).toBeUndefined();
        expect(resolved.find(r => r.driver_id === 'd2')?.position).toBe(2);
    });

    it('scopes substitutions to their race in multi-race input', () => {
        // sub1 subbed for d1 only in r1; in r2 sub1's own row must stay untouched
        const results = [mockResult('r1', 'sub1', 5), mockResult('r2', 'sub1', 7)];
        const subs = [mockSub('r1', 'd1', 'sub1')];

        const resolved = applySubstitutions(results, subs);

        expect(resolved.find(r => r.race_id === 'r1' && r.driver_id === 'd1')?.position).toBe(5);
        expect(resolved.find(r => r.race_id === 'r2' && r.driver_id === 'sub1')?.position).toBe(7);
    });

    it('does not mutate the input arrays', () => {
        const results = [mockResult('r1', 'sub1', 4)];
        const subs = [mockSub('r1', 'd1', 'sub1')];

        applySubstitutions(results, subs);

        expect(results[0].driver_id).toBe('sub1');
    });
});
