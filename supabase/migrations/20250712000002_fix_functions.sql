-- Drop existing functions first to avoid return type errors
DROP FUNCTION IF EXISTS public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.process_user_daily_payouts(UUID);
DROP FUNCTION IF EXISTS public.get_withdrawable_balance(UUID);

-- Add available_yield field to profiles table (if not exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS available_yield NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Create function to get total withdrawable balance (balance + available_yield)
CREATE OR REPLACE FUNCTION public.get_withdrawable_balance(_user_id UUID)
RETURNS NUMERIC(14,2) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total NUMERIC(14,2);
BEGIN
  SELECT (balance + available_yield) INTO total
  FROM public.profiles
  WHERE id = _user_id;
  
  RETURN COALESCE(total, 0);
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
  v_available_yield NUMERIC(14,2);
  v_total NUMERIC(14,2);
  remaining_amount NUMERIC(14,2);
BEGIN
  -- Get user's balances
  SELECT balance, available_yield INTO v_balance, v_available_yield
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
      -- Use only available_yield
      UPDATE public.profiles
      SET available_yield = available_yield - remaining_amount
      WHERE id = v_user_id;
      remaining_amount := 0;
    ELSE
      -- Use all available_yield, reduce remaining
      remaining_amount := remaining_amount - v_available_yield;
      UPDATE public.profiles
      SET available_yield = 0
      WHERE id = v_user_id;
    END IF;
  END IF;
  
  -- If still remaining, use balance
  IF remaining_amount > 0 THEN
    UPDATE public.profiles
    SET balance = balance - remaining_amount
      WHERE id = v_user_id;
  END IF;
  
  -- Create withdrawal record
  INSERT INTO public.withdrawals (user_id, amount, token, network, destination_address)
  VALUES (v_user_id, _amount, _token, _network, _address);
END;
$$;

-- Function to process payouts for a specific user on page load (like Coresera)
CREATE OR REPLACE FUNCTION public.process_user_daily_payouts(p_user_id UUID)
RETURNS TABLE(payout_amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_payout NUMERIC(14,2);
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
    -- Calculate daily payout
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
GRANT EXECUTE ON FUNCTION public.get_withdrawable_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
