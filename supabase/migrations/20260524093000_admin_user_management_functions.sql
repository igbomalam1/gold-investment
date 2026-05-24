CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  _user_id UUID,
  _action TEXT,
  _amount NUMERIC,
  _note TEXT DEFAULT NULL
) RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _admin UUID := auth.uid();
  _profile public.profiles;
  _clean_note TEXT := NULLIF(trim(coalesce(_note, '')), '');
BEGIN
  IF NOT public.has_role(_admin, 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  IF _action NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'Unsupported balance action: %', _action;
  END IF;

  SELECT *
    INTO _profile
  FROM public.profiles
  WHERE id = _user_id
  FOR UPDATE;

  IF _profile.id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF _action = 'debit' AND _profile.balance < _amount THEN
    RAISE EXCEPTION 'Debit exceeds current balance';
  END IF;

  UPDATE public.profiles
     SET balance =
       CASE
         WHEN _action = 'credit' THEN balance + _amount
         ELSE balance - _amount
       END
   WHERE id = _user_id
   RETURNING * INTO _profile;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (
    _user_id,
    CASE
      WHEN _action = 'credit' THEN 'Balance credited'
      ELSE 'Balance debited'
    END,
    CASE
      WHEN _clean_note IS NULL THEN
        format('An administrator %s your balance by $%s.', _action || 'ed', _amount)
      ELSE
        format('An administrator %s your balance by $%s. Note: %s', _action || 'ed', _amount, _clean_note)
    END
  );

  RETURN _profile;
END $$;

CREATE OR REPLACE FUNCTION public.admin_manage_investment(
  _investment_id UUID,
  _action TEXT
) RETURNS public.investments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _admin UUID := auth.uid();
  _investment public.investments;
  _plan_name TEXT;
BEGIN
  IF NOT public.has_role(_admin, 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  IF _action NOT IN ('suspend', 'activate', 'delete') THEN
    RAISE EXCEPTION 'Unsupported investment action: %', _action;
  END IF;

  SELECT *
    INTO _investment
  FROM public.investments
  WHERE id = _investment_id
  FOR UPDATE;

  IF _investment.id IS NULL THEN
    RAISE EXCEPTION 'Investment not found';
  END IF;

  SELECT name
    INTO _plan_name
  FROM public.plans
  WHERE id = _investment.plan_id;

  IF _action = 'delete' THEN
    DELETE FROM public.investments
    WHERE id = _investment_id;

    UPDATE public.profiles
       SET total_invested = GREATEST(0, total_invested - _investment.amount)
     WHERE id = _investment.user_id;

    INSERT INTO public.notifications (user_id, title, body)
    VALUES (
      _investment.user_id,
      'Investment removed',
      format('An administrator removed your %s investment record worth $%s.', coalesce(_plan_name, 'plan'), _investment.amount)
    );

    RETURN _investment;
  END IF;

  UPDATE public.investments
     SET status = CASE WHEN _action = 'suspend' THEN 'suspended' ELSE 'active' END
   WHERE id = _investment_id
   RETURNING * INTO _investment;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (
    _investment.user_id,
    CASE
      WHEN _action = 'suspend' THEN 'Investment suspended'
      ELSE 'Investment reactivated'
    END,
    format(
      'An administrator %s your %s investment.',
      CASE WHEN _action = 'suspend' THEN 'suspended' ELSE 'reactivated' END,
      coalesce(_plan_name, 'plan')
    )
  );

  RETURN _investment;
END $$;
