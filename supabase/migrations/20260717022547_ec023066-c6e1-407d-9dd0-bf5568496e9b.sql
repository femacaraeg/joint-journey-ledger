
-- Enums
CREATE TYPE public.owner_kind AS ENUM ('partner_a', 'partner_b', 'shared');
CREATE TYPE public.rollover_setting AS ENUM ('rollover', 'restart');
CREATE TYPE public.soa_status AS ENUM ('unpaid', 'paid');
CREATE TYPE public.pay_frequency AS ENUM ('monthly', 'semi_monthly', 'biweekly', 'weekly');

-- Helper: updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  email text,
  household_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- HOUSEHOLDS
CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Our Household',
  invite_code text NOT NULL UNIQUE,
  currency text NOT NULL DEFAULT 'PHP',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Membership helper (SECURITY DEFINER to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_household_member(_household_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND household_id = _household_id
  );
$$;

CREATE OR REPLACE FUNCTION public.current_household_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT household_id FROM public.profiles WHERE id = auth.uid();
$$;

-- PROFILES policies
CREATE POLICY "profiles: read self or same household"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (household_id IS NOT NULL AND household_id = public.current_household_id()));
CREATE POLICY "profiles: insert self"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles: update self"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- HOUSEHOLDS policies
CREATE POLICY "households: members read"
  ON public.households FOR SELECT TO authenticated
  USING (id = public.current_household_id());
CREATE POLICY "households: create"
  ON public.households FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "households: members update"
  ON public.households FOR UPDATE TO authenticated
  USING (id = public.current_household_id())
  WITH CHECK (id = public.current_household_id());

-- INCOME SOURCES (regular income per partner)
CREATE TABLE public.income_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Salary',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  pay_frequency public.pay_frequency NOT NULL DEFAULT 'semi_monthly',
  payday_days int[] NOT NULL DEFAULT '{15,30}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_sources TO authenticated;
GRANT ALL ON public.income_sources TO service_role;
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "income_sources: household access"
  ON public.income_sources FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());

-- OTHER INCOME (irregular)
CREATE TABLE public.other_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  received_on date NOT NULL DEFAULT CURRENT_DATE,
  source_label text NOT NULL,
  note text,
  allocated_category_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.other_income TO authenticated;
GRANT ALL ON public.other_income TO service_role;
ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "other_income: household access"
  ON public.other_income FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  owner public.owner_kind NOT NULL DEFAULT 'shared',
  base_budget_amount numeric(14,2) NOT NULL DEFAULT 0,
  rollover_setting public.rollover_setting NOT NULL DEFAULT 'restart',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories: household access"
  ON public.categories FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());

-- CATEGORY CYCLE ACTUALS (per calendar month)
CREATE TABLE public.category_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  cycle_month date NOT NULL, -- first day of month
  actual_spend numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, cycle_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_cycles TO authenticated;
GRANT ALL ON public.category_cycles TO service_role;
ALTER TABLE public.category_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "category_cycles: household access"
  ON public.category_cycles FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());

-- CREDIT CARDS
CREATE TABLE public.credit_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  cutoff_day int NOT NULL CHECK (cutoff_day BETWEEN 1 AND 31),
  due_day int NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  linked_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_cards TO authenticated;
GRANT ALL ON public.credit_cards TO service_role;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_cards: household access"
  ON public.credit_cards FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());

-- SOA ENTRIES
CREATE TABLE public.soa_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  credit_card_id uuid NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  cycle_month date NOT NULL,
  amount numeric(14,2) NOT NULL,
  due_date date NOT NULL,
  status public.soa_status NOT NULL DEFAULT 'unpaid',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.soa_entries TO authenticated;
GRANT ALL ON public.soa_entries TO service_role;
ALTER TABLE public.soa_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "soa_entries: household access"
  ON public.soa_entries FOR ALL TO authenticated
  USING (household_id = public.current_household_id())
  WITH CHECK (household_id = public.current_household_id());

-- Triggers for updated_at
CREATE TRIGGER _t_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER _t_households BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER _t_income_sources BEFORE UPDATE ON public.income_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER _t_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER _t_category_cycles BEFORE UPDATE ON public.category_cycles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER _t_credit_cards BEFORE UPDATE ON public.credit_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER _t_soa_entries BEFORE UPDATE ON public.soa_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Household creation: creates household, seeds default categories, joins creator
CREATE OR REPLACE FUNCTION public.create_household(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _hid uuid;
  _code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  _code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  INSERT INTO public.households (name, invite_code, created_by)
    VALUES (COALESCE(NULLIF(_name, ''), 'Our Household'), _code, auth.uid())
    RETURNING id INTO _hid;

  UPDATE public.profiles SET household_id = _hid WHERE id = auth.uid();

  INSERT INTO public.categories (household_id, name, owner, sort_order) VALUES
    (_hid, 'Partner A – Cash', 'partner_a', 10),
    (_hid, 'Partner A – Credit', 'partner_a', 20),
    (_hid, 'Partner B – Cash', 'partner_b', 30),
    (_hid, 'Partner B – Credit', 'partner_b', 40),
    (_hid, 'Couple – Cash', 'shared', 50),
    (_hid, 'Couple – Credit', 'shared', 60),
    (_hid, 'Groceries', 'shared', 70),
    (_hid, 'Bills', 'shared', 80),
    (_hid, 'Investments / Savings', 'shared', 90);
  RETURN _hid;
END; $$;

CREATE OR REPLACE FUNCTION public.join_household(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _hid uuid;
  _count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO _hid FROM public.households WHERE invite_code = upper(_code);
  IF _hid IS NULL THEN RAISE EXCEPTION 'invalid invite code'; END IF;
  SELECT count(*) INTO _count FROM public.profiles WHERE household_id = _hid;
  IF _count >= 2 THEN RAISE EXCEPTION 'household already has two partners'; END IF;
  UPDATE public.profiles SET household_id = _hid WHERE id = auth.uid();
  RETURN _hid;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_household(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household(text) TO authenticated;
