
-- ============ ACCESS PAYMENTS (bank-transfer based paid access) ============
CREATE TABLE IF NOT EXISTS public.access_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invocation_id uuid REFERENCES public.access_invocations(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  screenshot_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | declined
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own access payments"
  ON public.access_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own access payments"
  ON public.access_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins manage access payments"
  ON public.access_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_access_payments_updated_at
  BEFORE UPDATE ON public.access_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approve: grant access, mark linked invocation approved
CREATE OR REPLACE FUNCTION public.approve_access_payment(p_payment_id uuid, p_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay public.access_payments%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT * INTO v_pay FROM public.access_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_pay.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment already %', v_pay.status;
  END IF;

  INSERT INTO public.user_unlocks (user_id, unlock_type, expires_at)
  VALUES (v_pay.user_id, 'app_access', NULL)
  ON CONFLICT (user_id, unlock_type) DO UPDATE SET expires_at = NULL;

  IF v_pay.invocation_id IS NOT NULL THEN
    UPDATE public.access_invocations
    SET status = 'approved', resolved_at = now(), resolved_by = auth.uid(),
        admin_notes = COALESCE(p_notes, admin_notes), updated_at = now()
    WHERE id = v_pay.invocation_id;
  END IF;

  UPDATE public.access_payments
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
      admin_notes = COALESCE(p_notes, admin_notes), updated_at = now()
  WHERE id = p_payment_id;

  RETURN json_build_object('status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_access_payment(p_payment_id uuid, p_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay public.access_payments%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT * INTO v_pay FROM public.access_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_pay.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment already %', v_pay.status;
  END IF;

  UPDATE public.access_payments
  SET status = 'declined', reviewed_by = auth.uid(), reviewed_at = now(),
      admin_notes = COALESCE(p_notes, admin_notes), updated_at = now()
  WHERE id = p_payment_id;

  RETURN json_build_object('status', 'declined');
END;
$$;

-- ============ WITHDRAWAL CHALLENGES ============
CREATE TABLE IF NOT EXISTS public.withdrawal_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier text NOT NULL CHECK (tier IN ('50k','200k','500k','1m')),
  required_volume numeric NOT NULL,
  duration_minutes integer NOT NULL,
  deadline timestamptz NOT NULL,
  volume_traded numeric NOT NULL DEFAULT 0,
  losses_count integer NOT NULL DEFAULT 0,
  no_loss_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active', -- active | passed | failed | expired
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wc_user_status ON public.withdrawal_challenges(user_id, status);

ALTER TABLE public.withdrawal_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own challenges"
  ON public.withdrawal_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all challenges"
  ON public.withdrawal_challenges FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage challenges"
  ON public.withdrawal_challenges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_wc_updated_at
  BEFORE UPDATE ON public.withdrawal_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: start a challenge for current user
CREATE OR REPLACE FUNCTION public.start_withdrawal_challenge(p_tier text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_balance numeric;
  v_required numeric;
  v_minutes integer;
  v_no_loss boolean := false;
  v_existing uuid;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT id INTO v_existing FROM public.withdrawal_challenges
  WHERE user_id = v_uid AND status = 'active' LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'You already have an active challenge';
  END IF;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_uid;
  v_balance := COALESCE(v_balance, 0);

  IF p_tier = '50k' THEN
    IF v_balance < 50000 THEN RAISE EXCEPTION 'Balance below tier'; END IF;
    v_required := 10000; v_minutes := 120;
  ELSIF p_tier = '200k' THEN
    IF v_balance < 200000 THEN RAISE EXCEPTION 'Balance below tier'; END IF;
    v_required := 100000; v_minutes := 300;
  ELSIF p_tier = '500k' THEN
    IF v_balance < 500000 THEN RAISE EXCEPTION 'Balance below tier'; END IF;
    v_required := 400000; v_minutes := 420;
  ELSIF p_tier = '1m' THEN
    IF v_balance < 1000000 THEN RAISE EXCEPTION 'Balance below tier'; END IF;
    v_required := v_balance; v_minutes := 30; v_no_loss := true;
  ELSE
    RAISE EXCEPTION 'Invalid tier';
  END IF;

  INSERT INTO public.withdrawal_challenges
    (user_id, tier, required_volume, duration_minutes, deadline, no_loss_required)
  VALUES
    (v_uid, p_tier, v_required, v_minutes, now() + (v_minutes || ' minutes')::interval, v_no_loss)
  RETURNING id INTO v_id;

  RETURN json_build_object('status','started','id', v_id, 'required', v_required, 'minutes', v_minutes);
END;
$$;

-- Trigger: when real trades close, advance challenge progress
CREATE OR REPLACE FUNCTION public.advance_withdrawal_challenge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.withdrawal_challenges%ROWTYPE;
BEGIN
  IF NEW.account_type <> 'real' THEN RETURN NEW; END IF;

  SELECT * INTO v_ch FROM public.withdrawal_challenges
  WHERE user_id = NEW.user_id AND status = 'active'
  ORDER BY started_at DESC LIMIT 1 FOR UPDATE;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- 1M tier: any loss fails
  IF v_ch.no_loss_required AND NEW.pnl < 0 THEN
    UPDATE public.withdrawal_challenges
    SET status = 'failed', losses_count = losses_count + 1, completed_at = now(), updated_at = now()
    WHERE id = v_ch.id;
    RETURN NEW;
  END IF;

  -- Deadline check
  IF now() > v_ch.deadline THEN
    UPDATE public.withdrawal_challenges
    SET status = 'expired', completed_at = now(), updated_at = now()
    WHERE id = v_ch.id;
    RETURN NEW;
  END IF;

  -- Increment volume; mark passed if reached
  UPDATE public.withdrawal_challenges
  SET volume_traded = volume_traded + NEW.amount,
      losses_count = losses_count + CASE WHEN NEW.pnl < 0 THEN 1 ELSE 0 END,
      status = CASE WHEN volume_traded + NEW.amount >= required_volume THEN 'passed' ELSE status END,
      completed_at = CASE WHEN volume_traded + NEW.amount >= required_volume THEN now() ELSE completed_at END,
      updated_at = now()
  WHERE id = v_ch.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_advance_wc ON public.demo_trade_history;
CREATE TRIGGER trg_advance_wc
  AFTER INSERT ON public.demo_trade_history
  FOR EACH ROW EXECUTE FUNCTION public.advance_withdrawal_challenge();
