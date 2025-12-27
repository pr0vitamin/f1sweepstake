-- Add DNF and DSQ point values to seasons table
-- These values are used when calculating points for drivers who did not finish or were disqualified

alter table public.seasons
  add column if not exists dnf_points integer not null default -5,
  add column if not exists dsq_points integer not null default -5;

-- Add comment describing the columns
comment on column public.seasons.dnf_points is 'Points awarded to drivers who did not finish (DNF)';
comment on column public.seasons.dsq_points is 'Points awarded to drivers who were disqualified (DSQ)';
