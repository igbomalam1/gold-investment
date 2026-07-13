-- SIMPLE yield→balance credit
-- Calculates ALL accumulated yield since last payout and credits it in one shot

-- 1. Drop ALL old functions
DROP FUNCTION IF EXISTS public.credit_daily_yield_to_balance(UUID);
DROP FUNCTION IF EXISTS public.credit_all_daily_yield();
DROP FUNCTION IF EXISTS public.credit_all_yield_to_balance(UUID);
DROP FUNCTION IF EXISTS public.credit_yield_to_balance(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.calculate_pending_yield(UUID);

-- 2. Per-user: credit ALL accumulated yield to balance
CREATE OR REPLACE FUNCTION public.credit_daily_yield_to_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_daily NUMERIC(14,2);
  v_days NUMERIC;
  v_credit NUMERIC(14,2);
  v_total NUMERIC(14,2) := 0;
BEGIN
  FOR r IN
    SELECT i.id, i.amount, i.daily_roi_pct, i.started_at, i.last_payout_at
    FROM public.investments i
    WHERE i.status = 'active'
      AND i.user_id = p_user_id
    FOR UPDATE OF i SKIP LOCKED
  LOOP
    -- Days since last credit (or since investment started)
    v_days := EXTRACT(EPOCH FROM (NOW() - COALESCE(r.last_payout_at, r.started_at))) / 86400;

    IF v_days < 1 THEN
      CONTINUE;
    END IF;

    -- Daily yield = amount * percentage / 100
    v_daily := (r.amount * r.daily_roi_pct) / 100;

    -- Total credit = daily yield * days elapsed
    v_credit := v_daily * v_days;

    -- Add to user balance
    UPDATE public.profiles
    SET balance = balance + v_credit,
        total_profit = total_profit + v_credit
    WHERE id = p_user_id;

    -- Mark as credited now
    UPDATE public.investments
    SET last_payout_at = NOW()
    WHERE id = r.id;

    v_total := v_total + v_credit;
  END LOOP;

  RETURN v_total;
END;
$$;

-- 3. Global: credit ALL users (admin trigger button)
CREATE OR REPLACE FUNCTION public.credit_all_daily_yield()
RETURNS TABLE(user_id UUID, credited NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_daily NUMERIC(14,2);
  v_days NUMERIC;
  v_credit NUMERIC(14,2);
BEGIN
  FOR r IN
    SELECT i.id, i.user_id, i.amount, i.daily_roi_pct, i.started_at, i.last_payout_at
    FROM public.investments i
    WHERE i.status = 'active'
    FOR UPDATE OF i SKIP LOCKED
  LOOP
    v_days := EXTRACT(EPOCH FROM (NOW() - COALESCE(r.last_payout_at, r.started_at))) / 86400;

    IF v_days < 1 THEN
      CONTINUE;
    END IF;

    v_daily := (r.amount * r.daily_roi_pct) / 100;
    v_credit := v_daily * v_days;

    UPDATE public.profiles
    SET balance = balance + v_credit,
        total_profit = total_profit + v_credit
    WHERE id = r.user_id;

    UPDATE public.investments
    SET last_payout_at = NOW()
    WHERE id = r.id;

    user_id := r.user_id;
    credited := v_credit;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.credit_daily_yield_to_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_all_daily_yield() TO authenticated;
