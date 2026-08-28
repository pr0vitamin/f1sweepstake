# Driver Substitutions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record last-minute driver substitutions per race so results show the real drivers while scoring credits the seat's original (drafted) driver's picker.

**Architecture:** New `driver_substitutions` table maps `seat_driver_id → substitute_driver_id` per race. Results are always stored against the real driver. A pure function `applySubstitutions` re-keys substitute result rows to the seat driver at scoring time only; the four scoring consumers wrap their results with it. Substitutes are real `drivers` rows flagged `is_substitute` and excluded from the draft pool.

**Tech Stack:** Next.js 15 (App Router, server components), Supabase (Postgres + RLS), TypeScript, Vitest, shadcn/ui components.

**Spec:** `docs/superpowers/specs/2026-08-28-driver-substitutions-design.md`

## Global Constraints

- Run all commands from the worktree root (`.claude/worktrees/eager-lehmann-836648`).
- Verification commands: `npm run type-check`, `npm run lint`, `npm test` (Vitest).
- Follow existing code style: 4-space indent in `lib/` and tests, client components use the `createClient` from `@/lib/supabase/client`, server pages from `@/lib/supabase/server`.
- Migrations are plain SQL files in `supabase/migrations/`; they are NOT applied automatically. Applying `007` to the live DB is the user's deployment step — do not attempt to run it against any database.
- Substitutes must never appear in draft pools; substitution rows must survive results re-import (they live in their own table).
- No import wizard, no per-race draft pools, no retroactive substitutions for finalized races (out of scope).

---

### Task 1: Migration + types

**Files:**
- Create: `supabase/migrations/007_driver_substitutions.sql`
- Modify: `lib/types/database.ts` (Driver interface ~line 85, RaceResult section ~line 145, ChangelogEntityType ~line 197)
- Modify: `tests/unit/scoring.test.ts` (mockDriver fixture ~line 31)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `DriverSubstitution` and `DriverSubstitutionWithDrivers` types; `Driver.is_substitute: boolean`; SQL table `driver_substitutions(id, race_id, seat_driver_id, substitute_driver_id, created_at)`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/007_driver_substitutions.sql`:

```sql
-- Driver substitutions (seat-based scoring for last-minute driver changes)
-- Migration: 007_driver_substitutions.sql

-- ============================================================================
-- DRIVERS: substitute flag (excluded from draft pool, still valid in results)
-- ============================================================================
alter table public.drivers add column is_substitute boolean not null default false;

comment on column public.drivers.is_substitute is 'Reserve/substitute drivers are excluded from the draft pool but can appear in race results';

-- ============================================================================
-- DRIVER SUBSTITUTIONS TABLE
-- ============================================================================
create table public.driver_substitutions (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  seat_driver_id uuid not null references public.drivers(id) on delete cascade,
  substitute_driver_id uuid not null references public.drivers(id) on delete cascade,
  created_at timestamptz not null default now(),

  -- One sub per seat per race
  unique(race_id, seat_driver_id),
  -- A driver can sub for at most one seat per race
  unique(race_id, substitute_driver_id),
  check (seat_driver_id <> substitute_driver_id)
);

comment on table public.driver_substitutions is 'Per-race seat substitutions: the picker of seat_driver scores substitute_driver''s result';

alter table public.driver_substitutions enable row level security;

create index idx_driver_substitutions_race_id on public.driver_substitutions(race_id);

-- ============================================================================
-- RLS POLICIES (mirror race_results: everyone reads, admins write)
-- ============================================================================
create policy "Anyone can view driver substitutions"
  on public.driver_substitutions for select
  using (true);

create policy "Admins can insert driver substitutions"
  on public.driver_substitutions for insert
  with check (public.is_admin());

create policy "Admins can update driver substitutions"
  on public.driver_substitutions for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete driver substitutions"
  on public.driver_substitutions for delete
  using (public.is_admin());

-- ============================================================================
-- CHANGELOG TRIGGER
-- ============================================================================
create trigger log_driver_substitutions_changes
  after insert or update or delete on public.driver_substitutions
  for each row execute function public.log_change();
```

- [ ] **Step 2: Add types**

In `lib/types/database.ts`:

(a) Add `is_substitute: boolean;` to the `Driver` interface, after `is_active: boolean;` (~line 93).

(b) After the `RaceResultWithDriver` interface (~line 147), add a new section:

```ts
// ============================================================================
// Driver Substitutions
// ============================================================================

export interface DriverSubstitution {
  id: UUID;
  race_id: UUID;
  seat_driver_id: UUID;
  substitute_driver_id: UUID;
  created_at: Timestamp;
}

export type DriverSubstitutionInsert = Omit<DriverSubstitution, 'id' | 'created_at'>;

// Substitution with driver info (for display)
export interface DriverSubstitutionWithDrivers extends DriverSubstitution {
  seat_driver: Driver;
  substitute_driver: Driver;
}
```

(c) Add `| 'driver_substitutions'` to the `ChangelogEntityType` union (~line 197) — the trigger writes `TG_TABLE_NAME` as the entity type.

- [ ] **Step 3: Run type-check to find broken Driver literals**

Run: `npm run type-check`
Expected: FAIL — `tests/unit/scoring.test.ts` `mockDriver` object literal is missing `is_substitute`. (If other files fail, fix them the same way.)

- [ ] **Step 4: Fix fixtures**

In `tests/unit/scoring.test.ts`, add `is_substitute: false,` to the `mockDriver` factory (~line 31, after `is_active: true,`).

- [ ] **Step 5: Verify**

Run: `npm run type-check && npm test`
Expected: both PASS (no behavior changed yet).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/007_driver_substitutions.sql lib/types/database.ts tests/unit/scoring.test.ts
git commit -m "feat: add driver_substitutions schema and types"
```

---

### Task 2: `applySubstitutions` in scoring lib (TDD)

**Files:**
- Modify: `lib/scoring.ts` (add function at end of file)
- Test: `tests/unit/scoring.test.ts` (new describe block)

**Interfaces:**
- Consumes: `RaceResult`, `DriverSubstitution` from `@/lib/types/database` (Task 1)
- Produces: `applySubstitutions(results: RaceResult[], substitutions: DriverSubstitution[]): RaceResult[]` — exported from `@/lib/scoring`. Later tasks import it from there.

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/scoring.test.ts` (import `applySubstitutions` in the existing import block from `@/lib/scoring`, and `DriverSubstitution` from the types import). Add a fixture helper and describe block:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/scoring.test.ts`
Expected: FAIL — `applySubstitutions` is not exported.

- [ ] **Step 3: Implement**

Add to the end of `lib/scoring.ts` (and add `DriverSubstitution` to the type import at the top):

```ts
/**
 * Apply per-race driver substitutions to a set of race results (seat-based scoring).
 *
 * Any result row recorded for a substitute driver is re-keyed to the seat
 * (original) driver, so pick matching by driver_id credits the seat's picker.
 * Resolution is a single pass with no transitivity: chained swaps (A subs for B
 * while C subs for A) resolve as two independent re-keys. Uniqueness of
 * (race_id, seat_driver_id) and (race_id, substitute_driver_id) is enforced by
 * the database, so re-keying cannot produce duplicate driver_ids.
 *
 * Use the returned rows for scoring lookups only — joined display fields (e.g.
 * an embedded driver object) still describe the real driver who scored the result.
 */
export function applySubstitutions(
    results: RaceResult[],
    substitutions: DriverSubstitution[]
): RaceResult[] {
    if (substitutions.length === 0) return results;

    const seatBySubstitute = new Map(
        substitutions.map(s => [`${s.race_id}:${s.substitute_driver_id}`, s.seat_driver_id])
    );

    return results.map(result => {
        const seatDriverId = seatBySubstitute.get(`${result.race_id}:${result.driver_id}`);
        return seatDriverId ? { ...result, driver_id: seatDriverId } : result;
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/scoring.test.ts`
Expected: PASS (all existing + 7 new tests).

- [ ] **Step 5: Commit**

```bash
git add lib/scoring.ts tests/unit/scoring.test.ts
git commit -m "feat: add applySubstitutions seat-resolution to scoring lib"
```

---

### Task 3: Exclude substitutes from the draft pool

**Files:**
- Modify: `app/(dashboard)/draft/page.tsx` (~line 79 drivers query)
- Modify: `app/(dashboard)/draft/actions.ts` (~line 93 drivers query)

**Interfaces:**
- Consumes: `drivers.is_substitute` column (Task 1)
- Produces: nothing new — behavior change only

- [ ] **Step 1: Edit the draft page pool query**

In `app/(dashboard)/draft/page.tsx` (~line 79):

```ts
// before
        .from("drivers")
        .select("*, team:teams!inner(*)")
        .eq("team.season_id", race.season_id)
        .eq("is_active", true);

// after
        .from("drivers")
        .select("*, team:teams!inner(*)")
        .eq("team.season_id", race.season_id)
        .eq("is_active", true)
        .eq("is_substitute", false);
```

- [ ] **Step 2: Edit the draft actions pool query**

In `app/(dashboard)/draft/actions.ts` (~line 93, the `allDrivers` query used for draft-completion detection):

```ts
// before
            .from("drivers")
            .select("id, team:teams!inner(season_id)")
            .eq("team.season_id", race.season_id)
            .eq("is_active", true);

// after
            .from("drivers")
            .select("id, team:teams!inner(season_id)")
            .eq("team.season_id", race.season_id)
            .eq("is_active", true)
            .eq("is_substitute", false);
```

Note: do NOT touch the drivers query in `app/admin/races/[id]/results/page.tsx` — substitutes must remain visible to results import matching and manual entry.

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/draft/page.tsx" "app/(dashboard)/draft/actions.ts"
git commit -m "feat: exclude substitute drivers from draft pool"
```

---

### Task 4: Substitute checkbox on the driver admin form

**Files:**
- Modify: `components/admin/forms/driver-form.tsx`

**Interfaces:**
- Consumes: `drivers.is_substitute` column (Task 1)
- Produces: admins can create/edit drivers with `is_substitute` set

- [ ] **Step 1: Add the field to the form schema and data flow**

In `components/admin/forms/driver-form.tsx`:

(a) Add to the zod schema (~line 40, after `is_active`):

```ts
    is_substitute: z.boolean().default(false),
```

(b) Add to the `initialData` prop type (~line 58, after `is_active: boolean;`):

```ts
        is_substitute: boolean;
```

(c) Add to `defaultValues` (~line 69):

```ts
            is_substitute: initialData?.is_substitute ?? false,
```

(d) Add `is_substitute: values.is_substitute,` to BOTH the `.update({...})` payload (~line 87) and the `.insert({...})` payload (~line 101), next to `is_active`.

- [ ] **Step 2: Add the checkbox UI**

Duplicate the existing `is_active` `FormField` block (~lines 203–220) directly below itself, changing `name` to `"is_substitute"`, the label to `Substitute / reserve driver`, and the description to `Substitute drivers can appear in race results but are excluded from the draft pool.` Keep the same `Checkbox` + `FormControl` structure as the `is_active` block.

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/admin/forms/driver-form.tsx
git commit -m "feat: add substitute flag to driver admin form"
```

---

### Task 5: Substitutions card on the admin race results page

**Files:**
- Create: `components/admin/substitutions-manager.tsx`
- Modify: `app/admin/races/[id]/results/page.tsx`

**Interfaces:**
- Consumes: `driver_substitutions` table, `DriverSubstitutionWithDrivers` type (Task 1)
- Produces: admin UI to add/remove substitutions per race; locked when `race.results_finalized`

- [ ] **Step 1: Create the component**

Create `components/admin/substitutions-manager.tsx`. Follow the client-component pattern of `results-manager.tsx` (supabase browser client + `router.refresh()`):

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Race, Driver, RaceResult, DriverSubstitutionWithDrivers } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight, Trash2, AlertCircle, Loader2 } from "lucide-react";

interface SubstitutionsManagerProps {
    race: Race;
    substitutions: DriverSubstitutionWithDrivers[];
    drivers: (Driver & { team: { name: string; color: string } })[];
    existingResults: RaceResult[];
}

export function SubstitutionsManager({
    race,
    substitutions,
    drivers,
    existingResults,
}: SubstitutionsManagerProps) {
    const router = useRouter();
    const supabase = createClient();
    const [isPending, startTransition] = useTransition();

    const [seatDriverId, setSeatDriverId] = useState<string>("");
    const [substituteDriverId, setSubstituteDriverId] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    const driverLabel = (d: Driver & { team: { name: string } }) =>
        `${d.first_name} ${d.last_name} (${d.team.name})`;

    // Drivers already involved in a substitution for this race
    const usedSeatIds = new Set(substitutions.map(s => s.seat_driver_id));
    const usedSubstituteIds = new Set(substitutions.map(s => s.substitute_driver_id));

    // Inconsistency warning: a seat driver who also has their own result row
    const conflictingSubs = substitutions.filter(s =>
        existingResults.some(r => r.driver_id === s.seat_driver_id)
    );

    const handleAdd = () => {
        if (!seatDriverId || !substituteDriverId) return;
        setError(null);
        startTransition(async () => {
            const { error: insertError } = await supabase
                .from("driver_substitutions")
                .insert({
                    race_id: race.id,
                    seat_driver_id: seatDriverId,
                    substitute_driver_id: substituteDriverId,
                });
            if (insertError) {
                setError(insertError.message);
                return;
            }
            setSeatDriverId("");
            setSubstituteDriverId("");
            router.refresh();
        });
    };

    const handleDelete = (id: string) => {
        setError(null);
        startTransition(async () => {
            const { error: deleteError } = await supabase
                .from("driver_substitutions")
                .delete()
                .eq("id", id);
            if (deleteError) {
                setError(deleteError.message);
                return;
            }
            router.refresh();
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5" />
                    Substitutions
                </CardTitle>
                <CardDescription>
                    Record who actually drove a seat. The player who drafted the seat&apos;s
                    regular driver scores the substitute&apos;s result.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {conflictingSubs.length > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {conflictingSubs
                                .map(s => `${s.seat_driver.first_name} ${s.seat_driver.last_name}`)
                                .join(", ")}{" "}
                            has a substitution recorded but also has a result row of their own.
                            Remove one of the two — otherwise scoring is ambiguous.
                        </AlertDescription>
                    </Alert>
                )}

                {substitutions.length > 0 ? (
                    <div className="space-y-2">
                        {substitutions.map(sub => (
                            <div key={sub.id} className="flex items-center justify-between rounded-md border p-3">
                                <span className="text-sm">
                                    <span className="font-medium">
                                        {sub.substitute_driver.first_name} {sub.substitute_driver.last_name}
                                    </span>{" "}
                                    driving for{" "}
                                    <span className="font-medium">
                                        {sub.seat_driver.first_name} {sub.seat_driver.last_name}
                                    </span>
                                </span>
                                {!race.results_finalized && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(sub.id)}
                                        disabled={isPending}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No substitutions recorded for this race.
                    </p>
                )}

                {!race.results_finalized && (
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="flex-1 min-w-48">
                            <Select value={seatDriverId} onValueChange={setSeatDriverId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seat (original driver)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {drivers
                                        .filter(d => !usedSeatIds.has(d.id) && d.id !== substituteDriverId)
                                        .map(d => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {driverLabel(d)}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 min-w-48">
                            <Select value={substituteDriverId} onValueChange={setSubstituteDriverId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Substitute driver" />
                                </SelectTrigger>
                                <SelectContent>
                                    {drivers
                                        .filter(d => !usedSubstituteIds.has(d.id) && d.id !== seatDriverId)
                                        .map(d => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {driverLabel(d)}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={handleAdd}
                            disabled={isPending || !seatDriverId || !substituteDriverId}
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
```

- [ ] **Step 2: Wire it into the admin results page**

In `app/admin/races/[id]/results/page.tsx`:

(a) Add a fetch after the existing `drivers` query (~line 42):

```ts
    // Fetch substitutions for this race (with driver info for display)
    const { data: substitutions } = await supabase
        .from("driver_substitutions")
        .select(`
            *,
            seat_driver:drivers!driver_substitutions_seat_driver_id_fkey(*),
            substitute_driver:drivers!driver_substitutions_substitute_driver_id_fkey(*)
        `)
        .eq("race_id", raceId);
```

(b) Import the component and type:

```ts
import { SubstitutionsManager } from "@/components/admin/substitutions-manager";
import { DriverSubstitutionWithDrivers } from "@/lib/types/database";
```

(add `DriverSubstitutionWithDrivers` to the existing types import line)

(c) Render it above `<ResultsManager ...>` in the JSX:

```tsx
            <SubstitutionsManager
                race={typedRace}
                substitutions={(substitutions || []) as DriverSubstitutionWithDrivers[]}
                drivers={typedDrivers}
                existingResults={typedResults}
            />
```

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/admin/substitutions-manager.tsx "app/admin/races/[id]/results/page.tsx"
git commit -m "feat: admin UI to manage race driver substitutions"
```

---

### Task 6: Seat-resolved scoring in admin paths (finalize + draft order)

**Files:**
- Modify: `components/admin/results-manager.tsx` (`handleFinalizeResults`, ~lines 236–269)
- Modify: `app/admin/races/[id]/draft/actions.ts` (`generateDraftOrder`, ~lines 64–89)

**Interfaces:**
- Consumes: `applySubstitutions` from `@/lib/scoring` (Task 2); `driver_substitutions` table (Task 1)
- Produces: performance draft orders computed from seat-resolved points

- [ ] **Step 1: Wrap results in the finalize flow**

In `components/admin/results-manager.tsx`, inside `handleFinalizeResults`, after the race results fetch (step "5." ~line 236) add a substitutions fetch, and re-key results before computing points (~line 259):

```ts
                        // 5b. Fetch substitutions for THIS race (seat-based scoring)
                        const { data: substitutions } = await supabase
                            .from("driver_substitutions")
                            .select("*")
                            .eq("race_id", race.id);
```

Then change the scoring block:

```ts
// before
                        const { calculateRacePoints } = await import("@/lib/scoring");
                        const { generatePerformanceDraftOrder } = await import("@/lib/draft-order");

                        const playerPoints = profiles.map(profile => {
                            const userPicks = (picks || []).filter(p => p.user_id === profile.id);
                            const points = calculateRacePoints(userPicks, results || [], mappings || [], dnfPoints, dsqPoints);

// after
                        const { calculateRacePoints, applySubstitutions } = await import("@/lib/scoring");
                        const { generatePerformanceDraftOrder } = await import("@/lib/draft-order");

                        const resolvedResults = applySubstitutions(results || [], substitutions || []);
                        const playerPoints = profiles.map(profile => {
                            const userPicks = (picks || []).filter(p => p.user_id === profile.id);
                            const points = calculateRacePoints(userPicks, resolvedResults, mappings || [], dnfPoints, dsqPoints);
```

- [ ] **Step 2: Wrap results in `generateDraftOrder`**

In `app/admin/races/[id]/draft/actions.ts`:

(a) Add `applySubstitutions` to the existing `@/lib/scoring` import at the top.

(b) After the previous-race results fetch (~line 65) add:

```ts
        // Fetch substitutions for previous race (seat-based scoring)
        const { data: substitutions, error: subsError } = await supabase
            .from("driver_substitutions")
            .select("*")
            .eq("race_id", prevRace.id);

        if (subsError) throw new Error("Could not fetch previous substitutions");
```

(c) Re-key before scoring (~line 85):

```ts
// before
        const playerPoints = profiles.map(profile => {
            const userPicks = prevPicksRaw.filter((p: any) => p.user_id === profile.id);
            // ...
            const points = calculateRacePoints(userPicks, results, mappings, dnfPoints, dsqPoints);

// after
        const resolvedResults = applySubstitutions(results, substitutions || []);
        const playerPoints = profiles.map(profile => {
            const userPicks = prevPicksRaw.filter((p: any) => p.user_id === profile.id);
            // ...
            const points = calculateRacePoints(userPicks, resolvedResults, mappings, dnfPoints, dsqPoints);
```

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run lint && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/admin/results-manager.tsx "app/admin/races/[id]/draft/actions.ts"
git commit -m "feat: use seat-resolved results for finalize and draft-order scoring"
```

---

### Task 7: Race detail page — seat-resolved pick scoring + substitution badges

**Files:**
- Modify: `app/(dashboard)/races/[id]/page.tsx`

**Interfaces:**
- Consumes: `applySubstitutions` from `@/lib/scoring` (Task 2); `driver_substitutions` with driver joins (Task 1)
- Produces: nothing consumed later — display + page-local scoring

- [ ] **Step 1: Fetch substitutions and split the result-lookup helpers**

In `app/(dashboard)/races/[id]/page.tsx`:

(a) Add `applySubstitutions` to the page's imports from `@/lib/scoring` (add the import line if the page has none — it currently computes points inline).

(b) After the race results fetch (~line 42) add:

```ts
    // Fetch substitutions for this race (seat-based scoring + badges)
    const { data: substitutions } = await supabase
        .from("driver_substitutions")
        .select(`
            *,
            seat_driver:drivers!driver_substitutions_seat_driver_id_fkey(*),
            substitute_driver:drivers!driver_substitutions_substitute_driver_id_fkey(*)
        `)
        .eq("race_id", id);
```

(c) Replace the single `getDriverResult` helper (~lines 62–85) with a shared info function and two lookups — raw for the results table, seat-resolved for picks:

```ts
    // Seat-resolved copy of results: substitute rows re-keyed to the seat driver
    const resolvedResults = applySubstitutions(results ?? [], substitutions ?? []);

    // Helper to compute status + points from a result row
    const resultToInfo = (result: { position: number | null; dnf: boolean; dns: boolean; dsq: boolean }) => {
        let points = 0;
        let position = result.position;
        let status = position !== null ? `P${position}` : "N/C";

        if (result.dsq) {
            points = dsqPoints;
            status = "DSQ";
        } else if (result.dns) {
            points = dnfPoints;
            status = "DNS";
        } else if (result.dnf || position === null) {
            points = dnfPoints;
            status = result.dnf ? "DNF" : "N/C";
        } else {
            const mapping = pointMappings?.find(m => m.position === position);
            points = mapping?.points ?? 0;
        }

        return { position, status, points };
    };

    // Raw lookup: what the driver actually did (results table display)
    const getDriverResult = (driverId: string) => {
        const result = results?.find(r => r.driver_id === driverId);
        return result ? resultToInfo(result) : null;
    };

    // Seat-resolved lookup: what a picked driver scores (substitutions applied)
    const getPickResult = (driverId: string) => {
        const result = resolvedResults.find(r => r.driver_id === driverId);
        return result ? resultToInfo(result) : null;
    };

    // Substitution lookups for badges
    const subForSeat = (driverId: string) =>
        substitutions?.find(s => s.seat_driver_id === driverId);
    const subBySubstitute = (driverId: string) =>
        substitutions?.find(s => s.substitute_driver_id === driverId);
```

(d) Switch every **pick** scoring call from `getDriverResult` to `getPickResult` — there are three: the user's `totalPoints` reduce (~line 92), the sweepstake leaderboard grouping (`getDriverResult(pick.driver_id)` ~line 118), and the "Your Picks" row rendering (`getDriverResult(pick.driver_id)` ~line 198). The results-table call `getDriverResult(result.driver_id)` (~line 261) stays as-is.

- [ ] **Step 2: Add the badges**

(a) Results table row (~line 280, next to the driver name span): after the `{result.driver?.first_name} {result.driver?.last_name}` span, add:

```tsx
                                                {subBySubstitute(result.driver_id) && (
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        subbing for {subBySubstitute(result.driver_id)?.seat_driver?.last_name}
                                                    </Badge>
                                                )}
```

(b) "Your Picks" rows (~line 200, in the driver info `<div>` under the team name `<p>`): add:

```tsx
                                                    {race.results_finalized && subForSeat(pick.driver_id) && (
                                                        <p className="text-xs text-muted-foreground">
                                                            scored by {subForSeat(pick.driver_id)?.substitute_driver?.first_name}{" "}
                                                            {subForSeat(pick.driver_id)?.substitute_driver?.last_name}
                                                        </p>
                                                    )}
```

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/races/[id]/page.tsx"
git commit -m "feat: seat-resolved pick scoring and substitution badges on race page"
```

---

### Task 8: Season leaderboard — seat-resolved scoring

**Files:**
- Modify: `app/(dashboard)/leaderboard/page.tsx` (~lines 44–68)

**Interfaces:**
- Consumes: `applySubstitutions` from `@/lib/scoring` (Task 2)
- Produces: nothing consumed later — page-local scoring

- [ ] **Step 1: Fetch season substitutions and resolve once**

In `app/(dashboard)/leaderboard/page.tsx`:

(a) Add `applySubstitutions` to the existing `@/lib/scoring` import (the page already imports `getPointsForPosition`).

(b) After the race results fetch (~line 45) add:

```ts
    // Get substitutions for all finalized races (seat-based scoring)
    const { data: substitutions } = await supabase
        .from("driver_substitutions")
        .select("*")
        .in("race_id", races?.map(r => r.id) || []);
```

(c) Resolve before the standings loop and change the lookup (~line 63):

```ts
// before
    if (picks && results && mappings) {
        for (const pick of picks as any[]) {
            const result = results.find(r =>
                r.race_id === pick.race_id &&
                r.driver_id === pick.driver_id
            );

// after
    const resolvedResults = applySubstitutions(results || [], substitutions || []);

    if (picks && results && mappings) {
        for (const pick of picks as any[]) {
            const result = resolvedResults.find(r =>
                r.race_id === pick.race_id &&
                r.driver_id === pick.driver_id
            );
```

`applySubstitutions` is race-aware, so one call covers every race; the existing `race_id` check in the `.find` still applies.

- [ ] **Step 2: Verify**

Run: `npm run type-check && npm run lint && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/leaderboard/page.tsx"
git commit -m "feat: seat-resolved scoring on season leaderboard"
```

---

### Task 9: Full verification pass

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: everything above
- Produces: a verified branch ready for review/merge

- [ ] **Step 1: Run the full local suite**

Run: `npm run type-check && npm run lint && npm test`
Expected: all PASS. Fix anything that fails before proceeding.

- [ ] **Step 2: Spot-check the spec against the diff**

Run: `git log --oneline main..HEAD && git diff main --stat`
Confirm every spec section maps to a commit: migration/types, scoring function, draft pool exclusion, driver form, admin substitutions card, finalize + draft-order wiring, race page, leaderboard.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: address verification findings"
```

(Skip if nothing changed.)

---

## Post-merge runbook (user-executed, not part of implementation)

Deployment + backfill of the affected race, in order:

1. Apply `supabase/migrations/007_driver_substitutions.sql` to the live database (Supabase SQL editor or `supabase db push`).
2. Deploy the app.
3. In the drivers admin, create reserve driver C: correct `driver_number`, team = the team whose car C drove, "Substitute / reserve driver" checked.
4. On the affected race's admin results page, add two substitutions: A driving for B; C driving for A.
5. Import results from OpenF1 as normal — A and C match by driver number; B correctly gets no result row.
6. Verify the race page leaderboard shows seat-based points, then Finalize (this opens the next draft using the corrected points and sends notifications).
