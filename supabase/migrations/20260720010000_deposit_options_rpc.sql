-- Let authenticated users see which token/network combos are available for deposits
CREATE OR REPLACE FUNCTION public.get_active_deposit_options()
RETURNS TABLE (token TEXT, network TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT DISTINCT w.token, w.network
  FROM public.admin_wallets w
  WHERE w.is_active = true
  ORDER BY w.token, w.network;
END $$;

REVOKE ALL ON FUNCTION public.get_active_deposit_options() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_deposit_options() TO authenticated;
