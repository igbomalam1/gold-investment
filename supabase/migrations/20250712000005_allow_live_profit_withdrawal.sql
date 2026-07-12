-- Drop existing functions
DROP FUNCTION IF EXISTS public.process_user_daily_payouts(UUID);
DROP FUNCTION IF EXISTS public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_withdrawable_balance(UUID);

-- Add live_profit field to profiles to track uncredited earnings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS live_profit NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Function to update live profit (called on dashboard load)
CREATE OR REPLACE FUNCTION public.update_user_live_profit(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_live_profit NUMERIC(14,2) := 0;
BEGIN
  -- Calculate current live profit from active investments
  SELECT COALESCE(SUM(
    ((i.amount * i.daily_roi_pct) / 100) * 
    GREATEST(0, (LEAST(EXTRACT(EPOCH FROM NOW()), EXTRACT(EPOCH FROM i.ends_at)) - EXTRACT(EPOCH FROM i.started_at)) / 86400)
  ), 0)
  INTO v_live_profit
  FROM public.investments i
  WHERE i.user_id = p_user_id
    AND i.status = 'active'
    AND i.ends_at > NOW();
  
  -- Update profile with live profit
  UPDATE public.profiles
  SET live_profit = v_live_profit
  WHERE id = p_user_id;
END;
$$;

-- Function to credit live profit to available_yield (when user wants to withdraw)
CREATE OR REPLACE FUNCTION public.credit_live_profit_to_yield(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_live_profit NUMERIC(14,2);
BEGIN
  -- Get current live profit
  SELECT live_profit INTO v_live_profit
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF v_live_profit > 0 THEN
    -- Move live profit to available_yield
    UPDATE public.profiles
    SET available_yield = available_yield + v_live_profit,
        live_profit = 0
    WHERE id = p_user_id;
  END IF;
  
  RETURN COALESCE(v_live_profit, 0);
END;
$$;

-- Create request_withdrawal function that uses available_yield + live_profit
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
  v_available_yield NUMERIC(14,2);
  v_live_profit NUMERIC(14,2);
  v_total NUMERIC(14,2);
  remaining_amount NUMERIC(14,2);
BEGIN
  -- First, credit any live profit to available_yield
  PERFORM public.credit_live_profit_to_yield(v_user_id);
  
  -- Get user's balances
  SELECT balance, available_yield, live_profit INTO v_balance, v_available_yield, v_live_profit
  FROM public.profiles
  WHERE id = v_user_id;
  
  v_total := COALESCE(v_balance, 0) + COALESCE(v_available_yield, 0);
  
  -- Check if user has enough balance
  IF v_total < _amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %', v_total;
  END IF;
  
  -- First use available_yield, then balance
  remaining_amount := _amount;
  
  IF v_available_yield > 0 THEN
    IF v_available_yield >= remaining_amount THEN
      UPDATE public.profiles
      SET available_yield = available_yield - remaining_amount
      WHERE id = v_user_id;
      remaining_amount := 0;
    ELSE
      remaining_amount := remaining_amount - v_available_yield;
      UPDATE public.profiles
      SET available_yield = 0
      WHERE id = v_user_id;
    END IF;
  END IF;
  
  IF remaining_amount > 0 THEN
    UPDATE public.profiles
    SET balance = balance - remaining_amount
    WHERE id = v_user_id;
  END IF;
  
  INSERT INTO public.withdrawals (user_id, amount, token, network, destination_address)
  VALUES (v_user_id, _amount, _token, _network, _address);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_user_live_profit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_live_profit_to_yield(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_user_daily_payouts(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.process_user_daily_payouts(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_withdrawable_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
