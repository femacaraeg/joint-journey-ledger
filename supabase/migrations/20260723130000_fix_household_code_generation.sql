-- Fix household invite code generation for Supabase/Postgres environments without gen_random_bytes.
CREATE OR REPLACE FUNCTION public.create_household(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hid uuid;
  _code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

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
END;
$$;

CREATE OR REPLACE FUNCTION public.join_household(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hid uuid;
  _count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT id INTO _hid FROM public.households WHERE invite_code = upper(_code);
  IF _hid IS NULL THEN
    RAISE EXCEPTION 'invalid invite code';
  END IF;

  SELECT count(*) INTO _count FROM public.profiles WHERE household_id = _hid;
  IF _count >= 2 THEN
    RAISE EXCEPTION 'household already has two partners';
  END IF;

  UPDATE public.profiles SET household_id = _hid WHERE id = auth.uid();
  RETURN _hid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_household(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household(text) TO authenticated;
