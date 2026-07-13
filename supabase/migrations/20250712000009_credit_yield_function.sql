-- Add function to credit specific amount of yield to balance
CREATE OR REPLACE FUNCTION public.credit_yield_to_balance(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_yield NUMERIC(14,2);
  v_credit_amount NUMERIC(14,2);
BEGIN
  -- Calculate current pending yield
  SELECT COALESCE(SUM(
    ((i.amount * i.daily_roi_pct) / 100) * 
    GREATEST(0, (LEAST(EXTRACT(EPOCH FROM NOW()), EXTRACT(EPOCH FROM i.ends_at)) - EXTRACT(EPOCH FROM i.started_at)) / 86400)
  ), 0)
  INTO v_pending_yield
  FROM public.investments i
  WHERE i.user_id = p_user_id
    AND i.status = 'active'
    AND i.ends_at > NOW();
  
  -- Credit the requested amount (capped at pending yield)
  v_credit_amount := LEAST(p_amount, v_pending_yield);
  
  IF v_credit_amount > 0 THEN
    -- Add to balance
    UPDATE public.profiles
    SET balance = balance + v_credit_amount,
        total_profit = total_profit + v_credit_amount
    WHERE id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_yield_to_balance(UUID, NUMERIC) TO authenticated;
