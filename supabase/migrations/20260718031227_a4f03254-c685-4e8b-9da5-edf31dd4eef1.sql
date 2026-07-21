
-- Additive migration to reconcile with database-schema-v1.sql
-- Keeps existing columns intact; adds missing fields and the alerts table.

-- households: cycle start day
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS cycle_start_day integer NOT NULL DEFAULT 1;

-- categories: soft-delete + default seed flag
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- category_cycles: per-cycle budget snapshot + explicit start/end
ALTER TABLE public.category_cycles
  ADD COLUMN IF NOT EXISTS budget_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS cycle_start date,
  ADD COLUMN IF NOT EXISTS cycle_end date;

UPDATE public.category_cycles
  SET cycle_start = COALESCE(cycle_start, cycle_month),
      cycle_end   = COALESCE(cycle_end, (date_trunc('month', cycle_month) + interval '1 month - 1 day')::date)
  WHERE cycle_start IS NULL OR cycle_end IS NULL;

-- credit_cards: limit + soft-delete
ALTER TABLE public.credit_cards
  ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2),
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- soa_entries: statement amount alias + billing cycle bounds + paid_at
ALTER TABLE public.soa_entries
  ADD COLUMN IF NOT EXISTS statement_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS cycle_start date,
  ADD COLUMN IF NOT EXISTS cycle_end date,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

UPDATE public.soa_entries
  SET statement_amount = COALESCE(statement_amount, amount),
      cycle_start = COALESCE(cycle_start, cycle_month),
      cycle_end   = COALESCE(cycle_end, (date_trunc('month', cycle_month) + interval '1 month - 1 day')::date)
  WHERE statement_amount IS NULL OR cycle_start IS NULL OR cycle_end IS NULL;

-- payday_actuals: estimated/confirmed status
DO $$ BEGIN
  CREATE TYPE public.income_status AS ENUM ('estimated', 'confirmed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.payday_actuals
  ADD COLUMN IF NOT EXISTS status public.income_status NOT NULL DEFAULT 'confirmed';

-- alerts: in-app notifications
DO $$ BEGIN
  CREATE TYPE public.alert_type AS ENUM ('budget_threshold', 'soa_due_soon');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.alerts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  alert_type     public.alert_type NOT NULL,
  reference_id   uuid NOT NULL,
  message        text NOT NULL,
  is_read        boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts household members" ON public.alerts;
CREATE POLICY "alerts household members"
  ON public.alerts FOR ALL
  USING (public.is_household_member(household_id, auth.uid()))
  WITH CHECK (public.is_household_member(household_id, auth.uid()));

DROP POLICY IF EXISTS "alerts dev bypass all" ON public.alerts;
CREATE POLICY "alerts dev bypass all"
  ON public.alerts FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_alerts_household_unread ON public.alerts(household_id, is_read);
