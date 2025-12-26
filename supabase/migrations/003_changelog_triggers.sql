-- F1 Sweepstakes Changelog Triggers
-- Migration: 003_changelog_triggers.sql

-- ============================================================================
-- CHANGELOG TRIGGER FUNCTION
-- ============================================================================
create or replace function public.log_change()
returns trigger as $$
declare
  old_data jsonb;
  new_data jsonb;
  action_type text;
begin
  -- Determine action type
  if TG_OP = 'INSERT' then
    action_type := 'create';
    old_data := null;
    new_data := to_jsonb(NEW);
  elsif TG_OP = 'UPDATE' then
    action_type := 'update';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  elsif TG_OP = 'DELETE' then
    action_type := 'delete';
    old_data := to_jsonb(OLD);
    new_data := null;
  end if;

  -- Insert changelog entry
  insert into public.changelog (user_id, action, entity_type, entity_id, old_value, new_value)
  values (
    auth.uid(),
    action_type,
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    old_data,
    new_data
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- APPLY CHANGELOG TRIGGERS TO KEY TABLES
-- ============================================================================

-- Profiles changelog
create trigger log_profiles_changes
  after insert or update or delete on public.profiles
  for each row execute function public.log_change();

-- Seasons changelog
create trigger log_seasons_changes
  after insert or update or delete on public.seasons
  for each row execute function public.log_change();

-- Teams changelog
create trigger log_teams_changes
  after insert or update or delete on public.teams
  for each row execute function public.log_change();

-- Drivers changelog
create trigger log_drivers_changes
  after insert or update or delete on public.drivers
  for each row execute function public.log_change();

-- Races changelog
create trigger log_races_changes
  after insert or update or delete on public.races
  for each row execute function public.log_change();

-- Race results changelog
create trigger log_race_results_changes
  after insert or update or delete on public.race_results
  for each row execute function public.log_change();

-- Picks changelog
create trigger log_picks_changes
  after insert or update or delete on public.picks
  for each row execute function public.log_change();

-- Point mappings changelog
create trigger log_point_mappings_changes
  after insert or update or delete on public.point_mappings
  for each row execute function public.log_change();
