-- Add DNS (Did Not Start) column to race_results
-- DNS is treated the same as DNF for scoring purposes

alter table public.race_results add column dns boolean not null default false;
