
DROP POLICY IF EXISTS "alerts dev bypass all" ON public.alerts;
DROP POLICY IF EXISTS "dev bypass all" ON public.categories;
DROP POLICY IF EXISTS "dev bypass all" ON public.category_cycles;
DROP POLICY IF EXISTS "dev bypass all" ON public.credit_cards;
DROP POLICY IF EXISTS "dev bypass all" ON public.households;
DROP POLICY IF EXISTS "dev bypass all" ON public.income_sources;
DROP POLICY IF EXISTS "dev bypass all" ON public.other_income;
DROP POLICY IF EXISTS "dev bypass all" ON public.payday_actuals;
DROP POLICY IF EXISTS "dev bypass all" ON public.profiles;
DROP POLICY IF EXISTS "dev bypass all" ON public.soa_entries;

ALTER FUNCTION public.set_updated_at() SET search_path = public;
