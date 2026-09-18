-- Public pages evaluate these SECURITY DEFINER helpers inside RLS policies.
-- Anonymous users need EXECUTE to evaluate the policy expression; the helpers
-- return only authorization booleans and do not expose row data.

grant execute on function public.is_admin() to anon;
grant execute on function public.is_staff_or_admin() to anon;
