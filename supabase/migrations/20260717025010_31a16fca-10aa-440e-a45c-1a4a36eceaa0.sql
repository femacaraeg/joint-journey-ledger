
-- Bypass RLS for testing (auth is currently bypassed in the app).
-- Add permissive policies allowing anon + authenticated full access on household-scoped tables.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','category_cycles','credit_cards','households','income_sources','other_income','profiles','soa_entries']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "dev bypass all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "dev bypass all" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
