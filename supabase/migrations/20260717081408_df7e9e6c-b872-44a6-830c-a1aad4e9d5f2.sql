
ALTER TABLE public.income_sources RENAME COLUMN amount TO baseline_amount;

CREATE TABLE public.payday_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  income_source_id uuid NOT NULL REFERENCES public.income_sources(id) ON DELETE CASCADE,
  payday_date date NOT NULL,
  actual_amount numeric(14,2) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (income_source_id, payday_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payday_actuals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payday_actuals TO anon;
GRANT ALL ON public.payday_actuals TO service_role;

ALTER TABLE public.payday_actuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payday_actuals: household access"
  ON public.payday_actuals FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());

CREATE POLICY "dev bypass all" ON public.payday_actuals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER _t_payday_actuals BEFORE UPDATE ON public.payday_actuals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
