-- =============================================================
-- Auto-credit yield when users visit the site (like Coresera)
-- =============================================================

-- Function to process payouts for a specific user on page load
CREATE OR REPLACE FUNCTION public.process_user_daily_payouts(p_user_id UUID)
RETURNS TABLE(payout_amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_payout NUMERIC(14,2);
  v_days_to_credit INT;
  v_credit_date TIMESTAMPTZ;
BEGIN
  FOR r IN
    SELECT i.id, i.user_id, i.amount, i.daily_roi_pct, i.started_at, i.ends_at,
           i.duration_days, i.status
    FROM public.investments i
    WHERE i.status = 'active'
      AND i.user_id = p_user_id
      AND i.ends_at > NOW()
    FOR UPDATE OF i SKIP LOCKED
  LOOP
    -- Calculate how many days of yield to credit (since last visit/credit)
    -- For now, credit 1 day at a time when user visits
    v_payout := (r.amount * r.daily_roi_pct) / 100;
    
    -- Add to user's available_yield
    UPDATE public.profiles
    SET available_yield = available_yield + v_payout,
        total_profit = total_profit + v_payout
    WHERE id = p_user_id;
    
    payout_amount := v_payout;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_user_daily_payouts(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.process_user_daily_payouts(UUID) FROM PUBLIC, anon;
