-- 1. Add admin_assigned flag and allow a custom tier
ALTER TABLE public.withdrawal_challenges
  ADD COLUMN IF NOT EXISTS admin_assigned boolean NOT NULL DEFAULT false;

ALTER TABLE public.withdrawal_challenges
  DROP CONSTRAINT IF EXISTS withdrawal_challenges_tier_check;
ALTER TABLE public.withdrawal_challenges
  ADD CONSTRAINT withdrawal_challenges_tier_check
  CHECK (tier = ANY (ARRAY['50k'::text, '200k'::text, '500k'::text, '1m'::text, 'custom'::text]));

-- 2. Fix settle_binary_position: do NOT reference non-existent columns
--    (exit_price / is_win do not exist on demo_positions). Record history and credit wallets.
CREATE OR REPLACE FUNCTION public.settle_binary_position(p_position_id uuid, p_exit_price numeric, p_close_reason text DEFAULT 'expired'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_position record;
  v_is_win boolean;
  v_pnl numeric;
  v_payout_rate numeric := 0.84;
  v_credited numeric := 0;
  v_pnl_percent numeric;
  v_duration int;
BEGIN
  SELECT * INTO v_position FROM demo_positions WHERE id = p_position_id;
  IF NOT FOUND THEN
    RETURN json_build_object('status', 'not_found');
  END IF;
  IF v_position.status = 'closed' THEN
    RETURN json_build_object('status', 'already_closed');
  END IF;

  IF v_position.trade_type = 'buy' THEN
    v_is_win := p_exit_price > v_position.entry_price;
  ELSE
    v_is_win := p_exit_price < v_position.entry_price;
  END IF;

  IF v_is_win THEN
    v_pnl := v_position.amount * v_payout_rate;
  ELSE
    v_pnl := -v_position.amount;
  END IF;

  v_pnl_percent := CASE WHEN v_position.amount > 0 THEN (v_pnl / v_position.amount) * 100 ELSE 0 END;
  v_duration := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - v_position.opened_at)))::int);

  UPDATE demo_positions
    SET status = 'closed',
        current_price = p_exit_price,
        pnl = v_pnl,
        pnl_percent = v_pnl_percent,
        closed_at = now(),
        close_reason = p_close_reason
  WHERE id = p_position_id;

  -- Record trade history (also drives challenge progress for real trades)
  INSERT INTO demo_trade_history (
    user_id, position_id, symbol, trade_type, entry_price, exit_price,
    amount, leverage, pnl, pnl_percent, duration_seconds, opened_at, closed_at,
    close_reason, account_type
  ) VALUES (
    v_position.user_id, p_position_id, v_position.symbol, v_position.trade_type,
    v_position.entry_price, p_exit_price, v_position.amount, COALESCE(v_position.leverage, 1),
    v_pnl, v_pnl_percent, v_duration, v_position.opened_at, now(),
    p_close_reason, v_position.account_type
  );

  IF v_position.account_type = 'real' THEN
    IF v_is_win THEN
      v_credited := v_position.amount + v_pnl;
      UPDATE public.wallets SET balance = balance + v_credited, updated_at = now()
      WHERE user_id = v_position.user_id;
    END IF;
  ELSE
    -- demo account
    IF v_is_win THEN
      v_credited := v_position.amount + v_pnl;
    ELSE
      v_credited := 0;
    END IF;
    UPDATE public.demo_wallets
      SET balance = balance + v_credited,
          total_pnl = total_pnl + v_pnl,
          total_trades = total_trades + 1,
          winning_trades = winning_trades + CASE WHEN v_is_win THEN 1 ELSE 0 END,
          updated_at = now()
    WHERE user_id = v_position.user_id;
  END IF;

  RETURN json_build_object('status', 'settled', 'is_win', v_is_win, 'pnl', v_pnl, 'credited', v_credited);
END;
$function$;

-- 3. Admin assigns a withdrawal challenge to a specific user
CREATE OR REPLACE FUNCTION public.admin_assign_withdrawal_challenge(
  p_user_id uuid,
  p_required_volume numeric,
  p_duration_minutes integer,
  p_no_loss boolean DEFAULT false
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_required_volume <= 0 OR p_duration_minutes <= 0 THEN
    RAISE EXCEPTION 'Invalid challenge parameters';
  END IF;

  -- Cancel any existing active challenges for this user first
  UPDATE public.withdrawal_challenges
    SET status = 'expired', completed_at = now(), updated_at = now()
  WHERE user_id = p_user_id AND status = 'active';

  INSERT INTO public.withdrawal_challenges
    (user_id, tier, required_volume, duration_minutes, deadline, no_loss_required, admin_assigned)
  VALUES
    (p_user_id, 'custom', p_required_volume, p_duration_minutes,
     now() + (p_duration_minutes || ' minutes')::interval, p_no_loss, true)
  RETURNING id INTO v_id;

  RETURN json_build_object('status', 'assigned', 'id', v_id);
END;
$function$;