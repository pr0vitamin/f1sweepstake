-- Fix: Allow draft to auto-close when non-admin makes the final pick.
-- This function bypasses RLS so any authenticated user's makePick action
-- can close the draft when it's complete.

create or replace function public.close_draft(p_race_id uuid)
returns void as $$
begin
  update public.races
  set picks_open = false
  where id = p_race_id;
end;
$$ language plpgsql security definer;
