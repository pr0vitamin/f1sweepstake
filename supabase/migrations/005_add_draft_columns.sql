-- Add draft_order column to races table
-- This stores the pre-calculated draft order (snake draft) for the race

alter table public.races 
add column if not exists draft_order jsonb;

comment on column public.races.draft_order is 'Stores the JSON array of draft slots [{userId, displayName, pickOrder, draftRound}, ...]';
