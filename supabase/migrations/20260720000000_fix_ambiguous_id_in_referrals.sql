-- Fix ambiguous "id" column reference in get_my_referrals
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

  SELECT p2.referral_code INTO _my_code
  FROM public.profiles p2
  WHERE p2.id = _uid;

  RETURN QUERY
  SELECT
    sub.uid,
    sub.masked,
    sub.joined
  FROM (
    SELECT
      p.id AS uid,
      public.mask_referral_identity(p.full_name, p.email, p.id) AS masked,
      p.created_at AS joined
    FROM public.profiles p
    WHERE p.id <> _uid
      AND (
        p.referrer_id::TEXT = _uid::TEXT
        OR (_my_code IS NOT NULL AND p.referrer_id::TEXT = _my_code)
      )
    ORDER BY p.created_at DESC
  ) sub;
END $$;

REVOKE ALL ON FUNCTION public.get_my_referrals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated, service_role;
