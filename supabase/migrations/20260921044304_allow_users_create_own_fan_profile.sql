create policy "users create own fan profile" on public.fan_profiles for insert to authenticated with check (profile_id = auth.uid());
