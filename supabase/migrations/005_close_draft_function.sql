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

-- Fix: Allow auto-assigning the last remaining driver to a player.
-- When only one driver remains, the system auto-assigns it. This must
-- work regardless of which user triggered the pick that caused it.

create or replace function public.auto_assign_pick(
  p_race_id uuid,
  p_user_id uuid,
  p_driver_id uuid,
  p_pick_order integer,
  p_draft_round integer
)
returns void as $$
begin
  insert into public.picks (race_id, user_id, driver_id, pick_order, draft_round)
  values (p_race_id, p_user_id, p_driver_id, p_pick_order, p_draft_round);
end;
$$ language plpgsql security definer;
