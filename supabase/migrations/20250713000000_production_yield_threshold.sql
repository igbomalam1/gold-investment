-- Production yield settlement: 24-hour threshold + global sweep function
-- No pg_cron needed — user visits = auto credit, admin button = credit all

-- 1. Update per-user function to production threshold (24 hours)
CREATE OR REPLACE FUNCTION public.credit_daily_yield_to_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_daily NUMERIC(14,2);
  v_total_credited NUMERIC(14,2) := 0;
  v_minutes_since_payout NUMERIC;
BEGIN
  FOR r IN
    SELECT i.id, i.amount, i.daily_roi_pct, i.last_payout_at
    FROM public.investments i
    WHERE i.status = 'active'
      AND i.user_id = p_user_id
      AND i.ends_at > NOW()
    FOR UPDATE OF i
  LOOP
    v_minutes_since_payout := EXTRACT(EPOCH FROM (NOW() - r.last_payout_at)) / 60;
    
    IF v_minutes_since_payout >= 1440 THEN
      v_daily := (r.amount * r.daily_roi_pct) / 100;
      
      UPDATE public.profiles
      SET balance = balance + v_daily,
          total_profit = total_profit + v_daily
      WHERE id = p_user_id;
      
      UPDATE public.investments
      SET last_payout_at = NOW()
      WHERE id = r.id;
      
      v_total_credited := v_total_credited + v_daily;
    END IF;
  END LOOP;
  
  RETURN v_total_credited;
END;
$$;

-- 2. Global sweep function: processes ALL users (admin trigger button)
CREATE OR REPLACE FUNCTION public.credit_all_daily_yield()
RETURNS TABLE(user_id UUID, credited NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_daily NUMERIC(14,2);
  v_minutes NUMERIC;
BEGIN
  FOR r IN
    SELECT i.id, i.user_id, i.amount, i.daily_roi_pct, i.last_payout_at
    FROM public.investments i
    WHERE i.status = 'active'
      AND i.ends_at > NOW()
    FOR UPDATE OF i SKIP LOCKED
  LOOP
    v_minutes := EXTRACT(EPOCH FROM (NOW() - r.last_payout_at)) / 60;
    
    IF v_minutes >= 1440 THEN
      v_daily := (r.amount * r.daily_roi_pct) / 100;
      
      UPDATE public.profiles
      SET balance = balance + v_daily,
          total_profit = total_profit + v_daily
      WHERE id = r.user_id;
      
      UPDATE public.investments
      SET last_payout_at = NOW()
      WHERE id = r.id;
      
      user_id := r.user_id;
      credited := v_daily;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.credit_daily_yield_to_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_all_daily_yield() TO authenticated;
