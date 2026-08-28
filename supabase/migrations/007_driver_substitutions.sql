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
