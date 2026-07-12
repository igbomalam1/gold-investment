-- Add available_yield field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS available_yield NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Create function to credit daily yield to available_yield
CREATE OR REPLACE FUNCTION public.credit_daily_yield()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD;
  daily_amount NUMERIC(14,2);
BEGIN
  -- Loop through all active investments
  FOR inv IN 
    SELECT i.id, i.user_id, i.amount, i.daily_roi_pct, i.started_at, i.ends_at
    FROM public.investments i
    WHERE i.status = 'active'
      AND i.ends_at > NOW()
  LOOP
    -- Calculate daily amount for this investment
    daily_amount := (inv.amount * inv.daily_roi_pct) / 100;
    
    -- Add to user's available_yield
    UPDATE public.profiles
    SET available_yield = available_yield + daily_amount
    WHERE id = inv.user_id;
  END LOOP;
END;
$$;

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

-- Update request_withdrawal function to use available_yield first, then balance
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
