# Driver Substitutions — Design

**Date:** 2026-08-28
**Status:** Approved for implementation

## Problem

Last-minute driver substitutions happen in F1 (injury, illness). The league rule is
**seat-based scoring**: a player who drafted a driver scores the result of whoever
actually drove that driver's seat. Today the data model has no way to express this —
the only workaround is recording results against the wrong driver (a "display fib"),
which breaks on re-import and misrepresents history.

Motivating case (race of 2026-08-28): driver A moved teams to replace injured
driver B; reserve driver C (not in the DB) filled A's old seat. Desired scoring:
B's picker gets A's real result; A's picker gets C's real result.

## Decisions already made

- **Seat-based scoring is permanent league policy.** The picker of a seat's regular
  driver scores whoever drove that seat.
- **Substitutes are never draftable** (option 1). Players always draft regular
  drivers; substitutions are purely a results-time concept. Long-term seat changes
  are handled as normal roster changes (deactivate/activate drivers).
- **Results are always recorded against the real driver.** Seat resolution happens
  at scoring time only.
- **No import wizard** for auto-creating substitute drivers from unmatched OpenF1
  rows. Admin creates the driver manually first. Revisit if it becomes annoying.
- Today's race waits for this feature and is entered through it (no interim SQL fix).

## 1. Schema (migration `007_driver_substitutions.sql`)

```sql
create table public.driver_substitutions (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  seat_driver_id uuid not null references public.drivers(id) on delete cascade,
  substitute_driver_id uuid not null references public.drivers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(race_id, seat_driver_id),        -- one sub per seat per race
  unique(race_id, substitute_driver_id),  -- a driver subs for at most one seat per race
  check (seat_driver_id <> substitute_driver_id)
);

alter table public.drivers add column is_substitute boolean not null default false;
```

Also:

- RLS policies mirroring `race_results` (authenticated read, admin write), following
  the patterns in `002_rls_policies.sql`.
- Changelog trigger (`log_driver_substitutions_changes`) matching
  `003_changelog_triggers.sql`.
- Index on `driver_substitutions(race_id)`.

**Semantics:** `drivers.is_substitute` means only "excluded from the draft pool"
(reserves). It does not restrict who may appear in a substitution row — a regular
draftable driver can be a substitute for another seat (the motivating case).

## 2. Scoring

New pure function in `lib/scoring.ts`:

```ts
applySubstitutions(results: RaceResult[], subs: DriverSubstitution[]): RaceResult[]
```

Single pass: any result row whose `(race_id, driver_id)` matches a substitution's
`(race_id, substitute_driver_id)` is re-keyed to `seat_driver_id`. Chained swaps
(A subs B, C subs A) resolve in one pass with no transitivity; unique constraints
guarantee no key collisions. Race-aware, so multi-race inputs work in one call.

**No existing scoring function changes.** Consumers fetch the relevant
`driver_substitutions` and wrap `results` before pick matching:

1. `app/(dashboard)/races/[id]/page.tsx` — race leaderboard + user pick points
2. `app/(dashboard)/leaderboard/page.tsx` — season standings (all races' subs in one query)
3. `components/admin/results-manager.tsx` — finalize step (next race's performance draft order)
4. `app/admin/races/[id]/draft/actions.ts` — `generateDraftOrder('performance')`

`race_results` rows remain the truth (real driver, real position); re-importing
results cannot break a substitution because the mapping lives in its own table.

New type `DriverSubstitution` in `lib/types/database.ts`; `is_substitute` added to
`Driver`.

## 3. Admin UI

- **Drivers form** (`components/admin/forms`): "Substitute / reserve driver"
  checkbox → `is_substitute`.
- **Race results admin page** (`app/admin/races/[id]/results`): a "Substitutions"
  card above the import section. Lists current subs ("A → driving for B"); add via
  two driver dropdowns (seat / substitute, both from the season's drivers); delete
  while un-finalized. Inline warning if a seat driver also has their own result row
  for the race (inconsistent state for the admin to resolve).
- Substitution editing locks once `results_finalized`, same as results.

## 4. Draft pool exclusion

Add `.eq("is_substitute", false)` to draftable-driver queries:

- `app/(dashboard)/draft/page.tsx` (drivers fetch)
- `app/(dashboard)/draft/actions.ts` (drivers fetch)

The admin results page's driver fetch is unchanged, so substitutes appear in
OpenF1 import matching (by `driver_number`) and manual results entry.

## 5. Display

- **Race results table**: real drivers shown (automatic). Badge on substitute rows:
  "↔ subbing for {seat driver}".
- **Pick rows** (race detail page): where a pick's seat had a sub, annotate
  "scored by {substitute}" next to the points.

## 6. Backfill: today's race

After shipping: create C (substitute checkbox, team = A's old team) → add two
substitution rows (A subs for B; C subs for A) → import from OpenF1 as normal
(A and C match by driver number; B correctly gets no row) → verify race
leaderboard → finalize through the UI. No direct SQL required.

## 7. Testing

Unit tests (`tests/unit/`) for `applySubstitutions`:

- no subs (identity)
- simple single sub
- chained double-sub (motivating case)
- substitution recorded but substitute has no result row (seat scores nothing)
- multi-race input resolves per-race

Existing scoring tests pass untouched. E2E out of scope.

## Out of scope

- Import wizard for creating substitutes from unmatched rows
- Per-race draft pools / draftable substitutes
- Retroactive substitution records for past finalized races
