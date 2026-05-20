-- AI Bot bank transfer purchases (monthly/yearly require bank transfer)
CREATE TABLE IF NOT EXISTS public.ai_bot_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_key text NOT NULL CHECK (plan_key IN ('6month','lifetime')),
  amount numeric NOT NULL,
  screenshot_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_bot_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own ai bot purchases" ON public.ai_bot_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users view own ai bot purchases" ON public.ai_bot_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins manage ai bot purchases" ON public.ai_bot_purchases
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ai_bot_purchases_updated_at
  BEFORE UPDATE ON public.ai_bot_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approve: grants user_unlocks for ai_trading_bot with proper expiry
CREATE OR REPLACE FUNCTION public.approve_ai_bot_purchase(p_purchase_id uuid, p_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pur public.ai_bot_purchases%ROWTYPE;
  v_expires timestamptz;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT * INTO v_pur FROM public.ai_bot_purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_pur.status <> 'pending' THEN RAISE EXCEPTION 'Already %', v_pur.status; END IF;

  IF v_pur.plan_key = '6month' THEN
    v_expires := now() + interval '180 days';
  ELSE
    v_expires := '9999-12-31 23:59:59+00'::timestamptz;
  END IF;

  INSERT INTO public.user_unlocks (user_id, unlock_type, expires_at)
  VALUES (v_pur.user_id, 'ai_trading_bot', v_expires)
  ON CONFLICT (user_id, unlock_type) DO UPDATE SET expires_at = EXCLUDED.expires_at;

  UPDATE public.ai_bot_purchases
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
      admin_notes = COALESCE(p_notes, admin_notes), updated_at = now()
  WHERE id = p_purchase_id;

  RETURN json_build_object('status','approved','expires_at', v_expires);
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_ai_bot_purchase(p_purchase_id uuid, p_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pur public.ai_bot_purchases%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT * INTO v_pur FROM public.ai_bot_purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_pur.status <> 'pending' THEN RAISE EXCEPTION 'Already %', v_pur.status; END IF;

  UPDATE public.ai_bot_purchases
  SET status = 'declined', reviewed_by = auth.uid(), reviewed_at = now(),
      admin_notes = COALESCE(p_notes, admin_notes), updated_at = now()
  WHERE id = p_purchase_id;

  RETURN json_build_object('status','declined');
END;
$$;

-- Force-fail the 1m withdrawal challenge: settle_binary_position must always
-- result in a loss for users with an active no-loss (1m tier) challenge.
CREATE OR REPLACE FUNCTION public.settle_binary_position(p_position_id uuid, p_exit_price numeric, p_close_reason text DEFAULT 'expired'::text)
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
  v_no_loss_active boolean := false;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO v_pos FROM public.demo_positions
  WHERE id = p_position_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Position not found'; END IF;
  IF v_pos.status <> 'open' THEN RETURN json_build_object('status','already_closed'); END IF;
  IF p_exit_price IS NULL THEN RAISE EXCEPTION 'Exit price required'; END IF;

  SELECT COALESCE(value::integer, 50) INTO v_difficulty
  FROM public.app_settings WHERE key = 'trading_difficulty';
  IF v_difficulty IS NULL THEN v_difficulty := 50; END IF;
  v_difficulty := GREATEST(10, LEAST(100, v_difficulty));

  v_is_win := CASE
    WHEN v_pos.trade_type = 'buy' THEN p_exit_price > v_pos.entry_price
    ELSE p_exit_price < v_pos.entry_price
  END;

  -- Force loss if user has an active no_loss (1m) withdrawal challenge
  SELECT EXISTS (
    SELECT 1 FROM public.withdrawal_challenges
    WHERE user_id = v_uid AND status = 'active' AND no_loss_required = true
  ) INTO v_no_loss_active;

  IF v_no_loss_active THEN
    v_is_win := false;
  ELSIF COALESCE(v_pos.account_type, 'demo') = 'real' AND v_is_win THEN
    v_rand := random();
    IF v_rand < (v_difficulty::double precision / 100.0) THEN
      v_is_win := false;
    END IF;
  END IF;

  v_pnl := CASE WHEN v_is_win THEN (v_pos.amount * 0.84)::numeric ELSE (-v_pos.amount)::numeric END;
  v_pnl_percent := CASE WHEN v_is_win THEN 84 ELSE -100 END;
  v_credit := CASE WHEN v_is_win THEN (v_pos.amount + (v_pos.amount * 0.84))::numeric ELSE 0::numeric END;
  v_duration_seconds := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_pos.opened_at)))::int);

  UPDATE public.demo_positions
  SET status = 'closed', current_price = p_exit_price, pnl = v_pnl, pnl_percent = v_pnl_percent,
      closed_at = v_now, close_reason = p_close_reason, account_type = COALESCE(v_pos.account_type, 'demo')
  WHERE id = p_position_id;

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
      RETURN json_build_object('status','settled','is_win',v_is_win,'pnl',v_pnl,
        'pnl_percent',v_pnl_percent,'credited',v_credit,
        'account_type',COALESCE(v_pos.account_type,'demo'),
        'old_balance',v_old_balance,'new_balance',v_new_balance);
    END IF;
  END IF;

  RETURN json_build_object('status','settled','is_win',v_is_win,'pnl',v_pnl,
    'pnl_percent',v_pnl_percent,'credited',v_credit,
    'account_type',COALESCE(v_pos.account_type,'demo'));
END;
$function$;