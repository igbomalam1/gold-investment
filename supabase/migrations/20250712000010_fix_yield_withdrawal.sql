-- Drop existing functions
DROP FUNCTION IF EXISTS public.credit_yield_to_balance(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT);

-- Function to calculate pending yield for a user
CREATE OR REPLACE FUNCTION public.calculate_pending_yield(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_yield NUMERIC(14,2);
BEGIN
  SELECT COALESCE(SUM(
    ((i.amount * i.daily_roi_pct) / 100) * 
    GREATEST(0, (LEAST(EXTRACT(EPOCH FROM NOW()), EXTRACT(EPOCH FROM i.ends_at)) - EXTRACT(EPOCH FROM i.started_at)) / 86400)
  ), 0)
  INTO v_pending_yield
  FROM public.investments i
  WHERE i.user_id = p_user_id
    AND i.status = 'active'
    AND i.ends_at > NOW();
  
  RETURN COALESCE(v_pending_yield, 0);
END;
$$;

-- Function to credit ALL pending yield to balance
CREATE OR REPLACE FUNCTION public.credit_all_yield_to_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_yield NUMERIC(14,2);
BEGIN
  -- Calculate pending yield
  v_pending_yield := public.calculate_pending_yield(p_user_id);
  
  -- Credit to balance if there's any yield
  IF v_pending_yield > 0 THEN
    UPDATE public.profiles
    SET balance = balance + v_pending_yield,
        total_profit = total_profit + v_pending_yield
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_pending_yield;
END;
$$;

-- Function to credit specific amount of yield to balance
CREATE OR REPLACE FUNCTION public.credit_yield_to_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_yield NUMERIC(14,2);
  v_credit_amount NUMERIC(14,2);
BEGIN
  -- Calculate pending yield
  v_pending_yield := public.calculate_pending_yield(p_user_id);
  
  -- Credit the requested amount (capped at pending yield)
  v_credit_amount := LEAST(p_amount, v_pending_yield);
  
  IF v_credit_amount > 0 THEN
    UPDATE public.profiles
    SET balance = balance + v_credit_amount,
        total_profit = total_profit + v_credit_amount
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_credit_amount;
END;
$$;

-- Create request_withdrawal function
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount NUMERIC,
  _token TEXT,
  _network TEXT,
  _address TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance NUMERIC(14,2);
BEGIN
  -- Get balance
  SELECT balance INTO v_balance
  FROM public.profiles
  WHERE id = v_user_id;
  
  -- Check balance
  IF COALESCE(v_balance, 0) < _amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %', COALESCE(v_balance, 0);
  END IF;
  
  -- Deduct from balance
  UPDATE public.profiles
  SET balance = balance - _amount
  WHERE id = v_user_id;
  
  -- Create withdrawal record
  INSERT INTO public.withdrawals (user_id, amount, token, network, destination_address)
  VALUES (v_user_id, _amount, _token, _network, _address);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_pending_yield(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_all_yield_to_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_yield_to_balance(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
