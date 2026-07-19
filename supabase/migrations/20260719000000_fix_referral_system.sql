-- 1. Helper: generate a short referral code from a UUID
CREATE OR REPLACE FUNCTION public.generate_referral_code(_uid UUID)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public AS $$
BEGIN
  RETURN upper(left(replace(_uid::TEXT, '-', ''), 8));
END $$;

-- 2. Create the missing apply_referral_code RPC
CREATE OR REPLACE FUNCTION public.apply_referral_code(_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _caller UUID := auth.uid();
  _referrer UUID;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _code IS NULL OR btrim(_code) = '' THEN
    RETURN;
  END IF;

  SELECT id INTO _referrer
  FROM public.profiles
  WHERE referral_code = btrim(_code)
     OR id::TEXT = btrim(_code);

  IF _referrer IS NULL OR _referrer = _caller THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET referrer_id = _referrer::TEXT
  WHERE id = _caller
    AND (referrer_id IS NULL OR referrer_id = '');
END $$;

REVOKE ALL ON FUNCTION public.apply_referral_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(TEXT) TO authenticated, service_role;

-- 3. Update handle_new_user to auto-generate referral_code and apply referrer from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
  _new_code TEXT;
  _referrer UUID;
  _ref TEXT;
BEGIN
  _new_code := public.generate_referral_code(NEW.id);

  INSERT INTO public.profiles (id, full_name, email, country, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'country', ''),
    _new_code
  );

  _ref := btrim(COALESCE(NEW.raw_user_meta_data->>'referral_code', ''));
  IF _ref <> '' THEN
    SELECT id INTO _referrer
    FROM public.profiles
    WHERE referral_code = _ref
       OR id::TEXT = _ref;

    IF _referrer IS NOT NULL AND _referrer <> NEW.id THEN
      UPDATE public.profiles SET referrer_id = _referrer::TEXT WHERE id = NEW.id;
    END IF;
  END IF;

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END $$;

-- 4. Backfill referral_code for existing users who don't have one
UPDATE public.profiles
SET referral_code = public.generate_referral_code(id)
WHERE referral_code IS NULL;

-- 5. Add unique index on referral_code
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_uniq
  ON public.profiles (referral_code)
  WHERE referral_code IS NOT NULL;
