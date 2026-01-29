-- Mark whether a position is demo/real so payouts can be credited correctly
ALTER TABLE public.demo_positions
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'demo';

ALTER TABLE public.demo_trade_history
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'demo';

-- Settle a binary-options position and (when applicable) credit the correct wallet
CREATE OR REPLACE FUNCTION public.settle_binary_position(
  p_position_id uuid,
  p_exit_price numeric,
  p_close_reason text DEFAULT 'expired'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_pos public.demo_positions%ROWTYPE;
  v_is_win boolean;
  v_pnl numeric;
  v_pnl_percent numeric;
  v_credit numeric;
  v_now timestamptz := now();
  v_duration_seconds integer;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_pos
  FROM public.demo_positions
  WHERE id = p_position_id
    AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Position not found';
  END IF;

  IF v_pos.status <> 'open' THEN
    RETURN json_build_object('status','already_closed');
  END IF;

  IF p_exit_price IS NULL THEN
    RAISE EXCEPTION 'Exit price required';
  END IF;

  v_is_win := CASE
    WHEN v_pos.trade_type = 'buy' THEN p_exit_price > v_pos.entry_price
    ELSE p_exit_price < v_pos.entry_price
  END;

  v_pnl := CASE WHEN v_is_win THEN v_pos.amount * 0.84 ELSE -v_pos.amount END;
  v_pnl_percent := CASE WHEN v_is_win THEN 84 ELSE -100 END;
  v_credit := CASE WHEN v_is_win THEN v_pos.amount + (v_pos.amount * 0.84) ELSE 0 END;

  v_duration_seconds := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_pos.opened_at)))::int);

  UPDATE public.demo_positions
  SET status='closed',
      current_price = p_exit_price,
      pnl = v_pnl,
      pnl_percent = v_pnl_percent,
      closed_at = v_now,
      close_reason = p_close_reason,
      account_type = COALESCE(v_pos.account_type, 'demo')
  WHERE id = p_position_id;

  INSERT INTO public.demo_trade_history (
    user_id,
    position_id,
    symbol,
    trade_type,
    entry_price,
    exit_price,
    amount,
    leverage,
    pnl,
    pnl_percent,
    duration_seconds,
    opened_at,
    closed_at,
    close_reason,
    account_type
  )
  VALUES (
    v_uid,
    p_position_id,
    v_pos.symbol,
    v_pos.trade_type,
    v_pos.entry_price,
    p_exit_price,
    v_pos.amount,
    COALESCE(v_pos.leverage, 1),
    v_pnl,
    v_pnl_percent,
    v_duration_seconds,
    v_pos.opened_at,
    v_now,
    p_close_reason,
    COALESCE(v_pos.account_type, 'demo')
  );

  IF COALESCE(v_pos.account_type, 'demo') = 'demo' THEN
    IF v_is_win THEN
      UPDATE public.demo_wallets
      SET balance = balance + v_credit,
          total_pnl = total_pnl + v_pnl,
          total_trades = total_trades + 1,
          winning_trades = winning_trades + 1,
          updated_at = now()
      WHERE user_id = v_uid;
    ELSE
      UPDATE public.demo_wallets
      SET total_pnl = total_pnl + v_pnl,
          total_trades = total_trades + 1,
          updated_at = now()
      WHERE user_id = v_uid;
    END IF;
  ELSE
    IF v_is_win THEN
      UPDATE public.wallets
      SET balance = balance + v_credit,
          updated_at = now()
      WHERE user_id = v_uid;
    END IF;
  END IF;

  RETURN json_build_object(
    'status','settled',
    'is_win', v_is_win,
    'pnl', v_pnl,
    'pnl_percent', v_pnl_percent,
    'credited', v_credit,
    'account_type', COALESCE(v_pos.account_type, 'demo')
  );
END;
$$;