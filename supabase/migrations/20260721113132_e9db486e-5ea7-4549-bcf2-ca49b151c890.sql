
-- Lock down SECURITY DEFINER helpers so only authenticated users can execute
REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_household_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.join_household(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_household(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_household_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_household(text) TO authenticated;

-- Pin search_path on set_updated_at trigger function
ALTER FUNCTION public.set_updated_at() SET search_path = public;
