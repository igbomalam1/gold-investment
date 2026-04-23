
-- Assign a random unused wallet (per user) for the requested token/network
-- and create the pending deposit row. Returns the deposit id.
CREATE OR REPLACE FUNCTION public.assign_deposit_wallet(
  _amount NUMERIC,
  _token TEXT,
  _network TEXT
) RETURNS public.deposits
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _wallet public.admin_wallets;
  _dep public.deposits;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount < 10 THEN
    RAISE EXCEPTION 'Amount must be at least 10';
  END IF;

  -- Pick a random active wallet for this token+network the user has NOT used yet
  SELECT w.* INTO _wallet
  FROM public.admin_wallets w
  WHERE w.token = _token
    AND w.network = _network
    AND w.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.deposits d
      WHERE d.wallet_id = w.id AND d.user_id = _uid
    )
  ORDER BY random()
  LIMIT 1;

  IF _wallet.id IS NULL THEN
    RAISE EXCEPTION 'No wallets available for % on % — please choose another token or contact support', _token, _network;
  END IF;

  INSERT INTO public.deposits (user_id, amount, token, network, wallet_id, wallet_address, expires_at)
  VALUES (_uid, _amount, _token, _network, _wallet.id, _wallet.address, now() + interval '1 hour')
  RETURNING * INTO _dep;

  -- Notify user
  INSERT INTO public.notifications (user_id, title, body)
  VALUES (_uid, 'Deposit pending', format('Send %s of %s on %s to the assigned wallet within 1 hour.', _amount, _token, _network));

  RETURN _dep;
END $$;

-- Admin credits a pending deposit
CREATE OR REPLACE FUNCTION public.admin_credit_deposit(_deposit_id UUID)
RETURNS public.deposits
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _admin UUID := auth.uid();
  _dep public.deposits;
BEGIN
  IF NOT public.has_role(_admin, 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  UPDATE public.deposits
     SET status = 'received', reviewed_by = _admin, reviewed_at = now()
   WHERE id = _deposit_id AND status = 'pending'
   RETURNING * INTO _dep;

  IF _dep.id IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or already reviewed';
  END IF;

  UPDATE public.profiles SET balance = balance + _dep.amount WHERE id = _dep.user_id;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (_dep.user_id, 'Deposit confirmed',
    format('Your deposit of $%s has been credited to your account.', _dep.amount));

  RETURN _dep;
END $$;

-- Admin rejects a pending deposit
CREATE OR REPLACE FUNCTION public.admin_reject_deposit(_deposit_id UUID, _reason TEXT DEFAULT NULL)
RETURNS public.deposits
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _admin UUID := auth.uid();
  _dep public.deposits;
BEGIN
  IF NOT public.has_role(_admin, 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  UPDATE public.deposits
     SET status = 'rejected', reviewed_by = _admin, reviewed_at = now(), notes = _reason
   WHERE id = _deposit_id AND status = 'pending'
   RETURNING * INTO _dep;

  IF _dep.id IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or already reviewed';
  END IF;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (_dep.user_id, 'Deposit rejected',
    coalesce(_reason, 'Your deposit was rejected. Please make the payment again or contact support.'));

  RETURN _dep;
END $$;

-- Create investment from balance
CREATE OR REPLACE FUNCTION public.create_investment(_plan_id UUID, _amount NUMERIC)
RETURNS public.investments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _plan public.plans;
  _profile public.profiles;
  _inv public.investments;
  _eff_roi NUMERIC;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _plan FROM public.plans WHERE id = _plan_id AND is_active;
  IF _plan.id IS NULL THEN RAISE EXCEPTION 'Plan not found'; END IF;
  IF _amount < _plan.min_amount OR _amount > _plan.max_amount THEN
    RAISE EXCEPTION 'Amount outside plan range ($% – $%)', _plan.min_amount, _plan.max_amount;
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _profile.balance < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  _eff_roi := _plan.daily_roi_pct + coalesce(_profile.custom_roi_bonus, 0);

  UPDATE public.profiles
     SET balance = balance - _amount,
         total_invested = total_invested + _amount
   WHERE id = _uid;

  INSERT INTO public.investments (user_id, plan_id, amount, daily_roi_pct, duration_days, ends_at)
  VALUES (_uid, _plan.id, _amount, _eff_roi, _plan.duration_days, now() + (_plan.duration_days || ' days')::interval)
  RETURNING * INTO _inv;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (_uid, 'Investment activated',
    format('You invested $%s in the %s plan at %s%%/day.', _amount, _plan.name, _eff_roi));

  RETURN _inv;
END $$;

-- Compute current profit for an investment
CREATE OR REPLACE FUNCTION public.investment_profit(_inv public.investments)
RETURNS NUMERIC LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT _inv.amount * _inv.daily_roi_pct / 100
       * LEAST(_inv.duration_days, GREATEST(0, EXTRACT(EPOCH FROM (LEAST(now(), _inv.ends_at) - _inv.started_at)) / 86400))
$$;

-- Request withdrawal
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount NUMERIC, _token TEXT, _network TEXT, _address TEXT
) RETURNS public.withdrawals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _profile public.profiles;
  _wdr public.withdrawals;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount < 10 THEN RAISE EXCEPTION 'Minimum withdrawal is $10'; END IF;
  SELECT * INTO _profile FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _profile.balance < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  -- Reserve balance immediately
  UPDATE public.profiles SET balance = balance - _amount WHERE id = _uid;

  INSERT INTO public.withdrawals (user_id, amount, token, network, destination_address)
  VALUES (_uid, _amount, _token, _network, _address)
  RETURNING * INTO _wdr;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (_uid, 'Withdrawal requested',
    format('Your withdrawal of $%s is being processed. It typically takes up to 24h.', _amount));

  RETURN _wdr;
END $$;

-- Admin reviews a withdrawal
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_id UUID, _approve BOOLEAN, _reason TEXT DEFAULT NULL)
RETURNS public.withdrawals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _admin UUID := auth.uid();
  _wdr public.withdrawals;
BEGIN
  IF NOT public.has_role(_admin, 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;

  UPDATE public.withdrawals
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         reviewed_by = _admin, reviewed_at = now(), notes = _reason
   WHERE id = _id AND status = 'pending'
   RETURNING * INTO _wdr;

  IF _wdr.id IS NULL THEN RAISE EXCEPTION 'Withdrawal not found or already reviewed'; END IF;

  IF NOT _approve THEN
    -- Refund the reserved balance
    UPDATE public.profiles SET balance = balance + _wdr.amount WHERE id = _wdr.user_id;
  END IF;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (_wdr.user_id,
    CASE WHEN _approve THEN 'Withdrawal approved' ELSE 'Withdrawal rejected' END,
    format('Your withdrawal of $%s has been %s.', _wdr.amount, CASE WHEN _approve THEN 'sent' ELSE 'rejected and refunded' END));

  RETURN _wdr;
END $$;

-- Admin updates a user's balance/ROI bonus
CREATE OR REPLACE FUNCTION public.admin_update_user(
  _user_id UUID, _balance NUMERIC, _roi_bonus NUMERIC
) RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _admin UUID := auth.uid();
  _p public.profiles;
BEGIN
  IF NOT public.has_role(_admin, 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.profiles
     SET balance = coalesce(_balance, balance),
         custom_roi_bonus = coalesce(_roi_bonus, custom_roi_bonus)
   WHERE id = _user_id
   RETURNING * INTO _p;
  RETURN _p;
END $$;

-- Reinvest from balance (same as create_investment but flagged via notification)
-- (uses create_investment under the hood from the client)

-- Reinvest profits: harvest profits to balance then call create_investment
-- Simplified: profits accrue continuously via investment_profit; we model
-- a "reinvest" by transferring an amount from total_profit-equivalent (balance) into a new investment.
