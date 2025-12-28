-- Allow admins to view all profiles (including inactive)
-- This is needed for the admin users management page

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());
