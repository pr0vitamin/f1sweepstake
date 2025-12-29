-- F1 Sweepstakes Initial Schema
-- Migration: 001_initial_schema.sql

-- ============================================================================
-- PROFILES TABLE (extends Supabase Auth users)
-- ============================================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- ============================================================================
-- SEASONS TABLE
-- ============================================================================
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique,
  is_current boolean not null default false,
  dnf_points integer not null default -5,
  dsq_points integer not null default -5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.seasons.dnf_points is 'Points awarded to drivers who did not finish (DNF)';
comment on column public.seasons.dsq_points is 'Points awarded to drivers who were disqualified (DSQ)';

alter table public.seasons enable row level security;

-- ============================================================================
-- POINT MAPPINGS TABLE (configurable scoring per season)
-- ============================================================================
create table public.point_mappings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  position integer not null,
  points integer not null,
  created_at timestamptz not null default now(),
  
  unique(season_id, position)
);

alter table public.point_mappings enable row level security;

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  color text not null default '#000000',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams enable row level security;

-- ============================================================================
-- DRIVERS TABLE
-- ============================================================================
create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  driver_number integer not null,
  first_name text not null,
  last_name text not null,
  abbreviation text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.drivers enable row level security;

-- ============================================================================
-- RACES TABLE
-- ============================================================================
create table public.races (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  location text not null,
  race_date date not null,
  round_number integer not null,
  results_finalized boolean not null default false,
  picks_open boolean not null default false,
  draft_order jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique(season_id, round_number)
);

comment on column public.races.draft_order is 'Stores the JSON array of draft slots [{userId, displayName, pickOrder, draftRound}, ...]';

alter table public.races enable row level security;

-- ============================================================================
-- RACE RESULTS TABLE
-- ============================================================================
create table public.race_results (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  position integer,
  dnf boolean not null default false,
  dsq boolean not null default false,
  created_at timestamptz not null default now(),
  
  unique(race_id, driver_id)
);

alter table public.race_results enable row level security;

-- ============================================================================
-- PICKS TABLE
-- ============================================================================
create table public.picks (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  pick_order integer not null,
  draft_round integer not null check (draft_round in (1, 2)),
  created_at timestamptz not null default now(),
  
  -- Each driver can only be picked once per race
  unique(race_id, driver_id),
  -- Each user can only have one pick per draft round per race
  unique(race_id, user_id, draft_round)
);

alter table public.picks enable row level security;

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('race_upcoming', 'results_available', 'your_turn_to_pick')),
  title text not null,
  message text not null,
  read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- ============================================================================
-- CHANGELOG TABLE (audit log)
-- ============================================================================
create table public.changelog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

alter table public.changelog enable row level security;

-- ============================================================================
-- INDEXES
-- ============================================================================
create index idx_profiles_email on public.profiles(email);
create index idx_drivers_team_id on public.drivers(team_id);
create index idx_drivers_driver_number on public.drivers(driver_number);
create index idx_races_season_id on public.races(season_id);
create index idx_races_race_date on public.races(race_date);
create index idx_race_results_race_id on public.race_results(race_id);
create index idx_picks_race_id on public.picks(race_id);
create index idx_picks_user_id on public.picks(user_id);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_read on public.notifications(user_id, read);
create index idx_changelog_entity on public.changelog(entity_type, entity_id);
create index idx_changelog_user_id on public.changelog(user_id);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.seasons
  for each row execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.teams
  for each row execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.drivers
  for each row execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.races
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- PROFILE CREATION TRIGGER (auto-create profile on user signup)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
