-- Mirror coresera's payout pattern exactly
-- Uses next_payout_at column instead of broken minutes math

-- 1. Add next_payout_at column (like coresera_stakings)
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS next_payout_at TIMESTAMPTZ;

-- 2. Backfill: set next_payout_at = started_at for all active investments
-- This ensures first payout triggers immediately for existing investments
UPDATE public.investments
SET next_payout_at = started_at
WHERE status = 'active'
  AND next_payout_at IS NULL;

-- Also set for new investments going forward
ALTER TABLE public.investments ALTER COLUMN next_payout_at SET DEFAULT NOW();

-- 3. Drop old broken functions
DROP FUNCTION IF EXISTS public.credit_daily_yield_to_balance(UUID);
DROP FUNCTION IF EXISTS public.credit_all_daily_yield();
DROP FUNCTION IF EXISTS public.credit_all_yield_to_balance(UUID);
DROP FUNCTION IF EXISTS public.credit_yield_to_balance(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.calculate_pending_yield(UUID);

-- 4. Per-user payout (called by auth.tsx on login — exact coresera pattern)
CREATE OR REPLACE FUNCTION public.credit_daily_yield_to_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_daily NUMERIC(14,2);
  v_total NUMERIC(14,2) := 0;
BEGIN
  FOR r IN
    SELECT i.id, i.amount, i.daily_roi_pct
    FROM public.investments i
    WHERE i.status = 'active'
      AND i.user_id = p_user_id
      AND i.ends_at > NOW()
      AND i.next_payout_at <= NOW()
    FOR UPDATE OF i SKIP LOCKED
  LOOP
    v_daily := (r.amount * r.daily_roi_pct) / 100;

    UPDATE public.profiles
    SET balance = balance + v_daily,
        total_profit = total_profit + v_daily
    WHERE id = p_user_id;

    UPDATE public.investments
    SET last_payout_at = NOW(),
        next_payout_at = NOW() + INTERVAL '1 day'
    WHERE id = r.id;

    v_total := v_total + v_daily;
  END LOOP;

  RETURN v_total;
END;
$$;

-- 5. Global payout (admin button — processes ALL users, exact coresera pattern)
CREATE OR REPLACE FUNCTION public.credit_all_daily_yield()
RETURNS TABLE(user_id UUID, credited NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_daily NUMERIC(14,2);
BEGIN
  FOR r IN
    SELECT i.id, i.user_id, i.amount, i.daily_roi_pct
    FROM public.investments i
    WHERE i.status = 'active'
      AND i.ends_at > NOW()
      AND i.next_payout_at <= NOW()
    FOR UPDATE OF i SKIP LOCKED
  LOOP
    v_daily := (r.amount * r.daily_roi_pct) / 100;

    UPDATE public.profiles
    SET balance = balance + v_daily,
        total_profit = total_profit + v_daily
    WHERE id = r.user_id;

    UPDATE public.investments
    SET last_payout_at = NOW(),
        next_payout_at = NOW() + INTERVAL '1 day'
    WHERE id = r.id;

    user_id := r.user_id;
    credited := v_daily;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.credit_daily_yield_to_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_all_daily_yield() TO authenticated;
