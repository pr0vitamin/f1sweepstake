-- F1 Sweepstakes RLS Policies
-- Migration: 002_rls_policies.sql

-- ============================================================================
-- HELPER FUNCTION: Check if user is admin
-- ============================================================================
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
end;
$$ language plpgsql security definer;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
-- Users can view all active profiles (for leaderboard, pick info)
create policy "Anyone can view active profiles"
  on public.profiles for select
  using (is_active = true);

-- Admins can view all profiles (including inactive)
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Users can update their own profile (display_name only)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can update any profile
create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- SEASONS POLICIES
-- ============================================================================
-- Everyone can view seasons
create policy "Anyone can view seasons"
  on public.seasons for select
  using (true);

-- Only admins can insert/update/delete seasons
create policy "Admins can insert seasons"
  on public.seasons for insert
  with check (public.is_admin());

create policy "Admins can update seasons"
  on public.seasons for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete seasons"
  on public.seasons for delete
  using (public.is_admin());

-- ============================================================================
-- POINT MAPPINGS POLICIES
-- ============================================================================
-- Everyone can view point mappings
create policy "Anyone can view point mappings"
  on public.point_mappings for select
  using (true);

-- Only admins can manage point mappings
create policy "Admins can insert point mappings"
  on public.point_mappings for insert
  with check (public.is_admin());

create policy "Admins can update point mappings"
  on public.point_mappings for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete point mappings"
  on public.point_mappings for delete
  using (public.is_admin());

-- ============================================================================
-- TEAMS POLICIES
-- ============================================================================
-- Everyone can view teams
create policy "Anyone can view teams"
  on public.teams for select
  using (true);

-- Only admins can manage teams
create policy "Admins can insert teams"
  on public.teams for insert
  with check (public.is_admin());

create policy "Admins can update teams"
  on public.teams for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete teams"
  on public.teams for delete
  using (public.is_admin());

-- ============================================================================
-- DRIVERS POLICIES
-- ============================================================================
-- Everyone can view drivers
create policy "Anyone can view drivers"
  on public.drivers for select
  using (true);

-- Only admins can manage drivers
create policy "Admins can insert drivers"
  on public.drivers for insert
  with check (public.is_admin());

create policy "Admins can update drivers"
  on public.drivers for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete drivers"
  on public.drivers for delete
  using (public.is_admin());

-- ============================================================================
-- RACES POLICIES
-- ============================================================================
-- Everyone can view races
create policy "Anyone can view races"
  on public.races for select
  using (true);

-- Only admins can manage races
create policy "Admins can insert races"
  on public.races for insert
  with check (public.is_admin());

create policy "Admins can update races"
  on public.races for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete races"
  on public.races for delete
  using (public.is_admin());

-- ============================================================================
-- RACE RESULTS POLICIES
-- ============================================================================
-- Everyone can view race results
create policy "Anyone can view race results"
  on public.race_results for select
  using (true);

-- Only admins can manage race results
create policy "Admins can insert race results"
  on public.race_results for insert
  with check (public.is_admin());

create policy "Admins can update race results"
  on public.race_results for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete race results"
  on public.race_results for delete
  using (public.is_admin());

-- ============================================================================
-- PICKS POLICIES
-- ============================================================================
-- Everyone can view picks (for transparency)
create policy "Anyone can view picks"
  on public.picks for select
  using (true);

-- Users can insert their own picks (when picks are open)
create policy "Users can insert own picks"
  on public.picks for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.races
      where id = race_id and picks_open = true
    )
  );

-- Users can update their own picks (with restrictions handled in app logic)
create policy "Users can update own picks"
  on public.picks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins can insert picks on behalf of others
create policy "Admins can insert any picks"
  on public.picks for insert
  with check (public.is_admin());

-- Admins can update any picks
create policy "Admins can update any picks"
  on public.picks for update
  using (public.is_admin())
  with check (public.is_admin());

-- Admins can delete picks
create policy "Admins can delete picks"
  on public.picks for delete
  using (public.is_admin());

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================
-- Users can only view their own notifications
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- System/admins can insert notifications (handled via service role)
create policy "Admins can insert notifications"
  on public.notifications for insert
  with check (public.is_admin());

-- Users can delete their own notifications
create policy "Users can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- CHANGELOG POLICIES
-- ============================================================================
-- Only admins can view changelog
create policy "Admins can view changelog"
  on public.changelog for select
  using (public.is_admin());

-- Changelog entries are inserted via triggers (service role)
-- No insert policy needed for regular users
