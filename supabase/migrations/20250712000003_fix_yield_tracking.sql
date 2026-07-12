-- Drop existing functions
DROP FUNCTION IF EXISTS public.process_user_daily_payouts(UUID);
DROP FUNCTION IF EXISTS public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT);

-- Add last_yield_credit_at to investments to track when yield was last credited
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS last_yield_credit_at TIMESTAMPTZ DEFAULT NOW();

-- Function to process payouts for a specific user on page load
-- Credits yield for each day since last credit
CREATE OR REPLACE FUNCTION public.process_user_daily_payouts(p_user_id UUID)
RETURNS TABLE(payout_amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_payout NUMERIC(14,2);
  v_days_since_credit INT;
  v_credit_up_to TIMESTAMPTZ;
BEGIN
  FOR r IN
    SELECT i.id, i.user_id, i.amount, i.daily_roi_pct, i.started_at, i.ends_at,
           i.duration_days, i.status, i.last_yield_credit_at
    FROM public.investments i
    WHERE i.status = 'active'
      AND i.user_id = p_user_id
      AND i.ends_at > NOW()
    FOR UPDATE OF i SKIP LOCKED
  LOOP
    -- Calculate days since last credit (max 1 day per visit to prevent abuse)
    v_days_since_credit := LEAST(
      EXTRACT(DAY FROM (NOW() - r.last_yield_credit_at))::INT,
      1
    );
    
    -- Only credit if at least 1 day has passed
    IF v_days_since_credit >= 1 THEN
      -- Calculate daily payout
      v_payout := (r.amount * r.daily_roi_pct) / 100;
      
      -- Add to user's available_yield
      UPDATE public.profiles
      SET available_yield = available_yield + v_payout,
          total_profit = total_profit + v_payout
      WHERE id = p_user_id;
      
      -- Update investment's last credit time
      UPDATE public.investments
      SET last_yield_credit_at = NOW()
      WHERE id = r.id;
      
      payout_amount := v_payout;
      RETURN NEXT;
    END IF;
  END LOOP;
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_user_daily_payouts(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.process_user_daily_payouts(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
```