-- Simple functions: frontend sends amount, backend adds to balance

-- 1. Drop all old broken functions
DROP FUNCTION IF EXISTS public.credit_daily_yield_to_balance(UUID);
DROP FUNCTION IF EXISTS public.credit_daily_yield_to_balance(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.credit_all_daily_yield();
DROP FUNCTION IF EXISTS public.credit_all_yield_to_balance(UUID);
DROP FUNCTION IF EXISTS public.credit_yield_to_balance(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.calculate_pending_yield(UUID);

-- 2. Per-user: frontend sends calculated amount, backend adds to balance
CREATE OR REPLACE FUNCTION public.credit_daily_yield_to_balance(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount <= 0 THEN RETURN 0; END IF;

  UPDATE public.profiles
  SET balance = balance + p_amount,
      total_profit = total_profit + p_amount
  WHERE id = p_user_id;

  RETURN p_amount;
END;
$$;

-- 3. Admin: credit yield for ALL users (calculates per-user in SQL)
CREATE OR REPLACE FUNCTION public.credit_all_daily_yield()
RETURNS TABLE(user_id UUID, credited NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_total_calc NUMERIC;
  v_already NUMERIC;
  v_pending NUMERIC;
BEGIN
  FOR r IN
    SELECT p.id AS uid,
           COALESCE(SUM(
             CASE WHEN i.status = 'active' THEN
               (i.amount * i.daily_roi_pct / 100) *
               GREATEST(0, EXTRACT(EPOCH FROM (LEAST(NOW(), i.ends_at) - i.started_at)) / 86400)
             ELSE 0 END
           ), 0) AS total_yield,
           COALESCE(p.total_profit, 0) AS credited_profit
    FROM public.profiles p
    LEFT JOIN public.investments i ON i.user_id = p.id
    GROUP BY p.id, p.total_profit
  LOOP
    v_pending := r.total_yield - r.credited_profit;
    IF v_pending > 0.01 THEN
      UPDATE public.profiles
      SET balance = balance + v_pending,
          total_profit = total_profit + v_pending
      WHERE id = r.uid;
      user_id := r.uid;
      credited := v_pending;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- 4. Grant
GRANT EXECUTE ON FUNCTION public.credit_daily_yield_to_balance(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_all_daily_yield() TO authenticated;
