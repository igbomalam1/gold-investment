ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referrer_id TEXT;

CREATE INDEX IF NOT EXISTS profiles_referrer_id_idx ON public.profiles (referrer_id);

CREATE OR REPLACE FUNCTION public.mask_referral_identity(
  _full_name TEXT,
  _email TEXT,
  _user_id UUID DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public AS $$
DECLARE
  _normalized_name TEXT := NULLIF(trim(regexp_replace(coalesce(_full_name, ''), '\s+', ' ', 'g')), '');
  _local_part TEXT;
  _domain_part TEXT;
  _visible_name_prefix INT;
  _visible_email_prefix INT;
BEGIN
  IF _normalized_name IS NOT NULL THEN
    _visible_name_prefix := LEAST(2, GREATEST(1, char_length(_normalized_name)));
    RETURN left(_normalized_name, _visible_name_prefix) || '****';
  END IF;

  IF _email IS NOT NULL AND position('@' IN _email) > 1 THEN
    _local_part := split_part(_email, '@', 1);
    _domain_part := split_part(_email, '@', 2);
    _visible_email_prefix := LEAST(3, GREATEST(1, char_length(_local_part)));
    RETURN left(_local_part, _visible_email_prefix) || '****@' || _domain_part;
  END IF;

  IF _user_id IS NOT NULL THEN
    RETURN 'User ' || left(_user_id::TEXT, 4) || '****';
  END IF;

  RETURN 'User ****';
END $$;

CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS TABLE (
  id UUID,
  masked_identity TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _my_code TEXT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT referral_code INTO _my_code
  FROM public.profiles
  WHERE id = _uid;

  RETURN QUERY
  SELECT
    p.id,
    public.mask_referral_identity(p.full_name, p.email, p.id) AS masked_identity,
    p.created_at AS joined_at
  FROM public.profiles p
  WHERE p.id <> _uid
    AND (
      p.referrer_id::TEXT = _uid::TEXT
      OR (_my_code IS NOT NULL AND p.referrer_id::TEXT = _my_code)
    )
  ORDER BY p.created_at DESC;
END $$;

REVOKE ALL ON FUNCTION public.get_my_referrals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated, service_role;
