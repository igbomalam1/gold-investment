-- Drop all existing functions
DROP FUNCTION IF EXISTS public.process_user_daily_payouts(UUID);
DROP FUNCTION IF EXISTS public.update_user_live_profit(UUID);
DROP FUNCTION IF EXISTS public.credit_live_profit_to_yield(UUID);
DROP FUNCTION IF EXISTS public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_withdrawable_balance(UUID);

-- Add last_payout_at to investments
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS last_payout_at TIMESTAMPTZ DEFAULT NOW();

-- Simple function: credit 1 day of yield to balance when user visits
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
  v_hours_since_payout NUMERIC;
BEGIN
  FOR r IN
    SELECT i.id, i.amount, i.daily_roi_pct, i.last_payout_at
    FROM public.investments i
    WHERE i.status = 'active'
      AND i.user_id = p_user_id
      AND i.ends_at > NOW()
    FOR UPDATE OF i
  LOOP
    -- Check if at least 1 hour has passed since last payout (for testing, use 24 hours in production)
    v_hours_since_payout := EXTRACT(EPOCH FROM (NOW() - r.last_payout_at)) / 3600;
    
    IF v_hours_since_payout >= 1 THEN
      -- Calculate daily yield
      v_daily := (r.amount * r.daily_roi_pct) / 100;
      
      -- Add to user's balance directly
      UPDATE public.profiles
      SET balance = balance + v_daily,
          total_profit = total_profit + v_daily
      WHERE id = p_user_id;
      
      -- Update last payout time
      UPDATE public.investments
      SET last_payout_at = NOW()
      WHERE id = r.id;
      
      v_total_credited := v_total_credited + v_daily;
    END IF;
  END LOOP;
  
  RETURN v_total_credited;
END;
$$;

-- Create simple withdrawal function
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
GRANT EXECUTE ON FUNCTION public.credit_daily_yield_to_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
