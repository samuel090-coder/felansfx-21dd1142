-- Per-user paid access invocations: admin can require a specific user to pay for access
CREATE TABLE public.access_invocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','approved','declined','cancelled')),
  paid_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_invocations_user ON public.access_invocations(user_id);
CREATE INDEX idx_access_invocations_status ON public.access_invocations(status);

ALTER TABLE public.access_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own invocations"
ON public.access_invocations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all invocations"
ON public.access_invocations FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage invocations"
ON public.access_invocations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_access_invocations_updated_at
BEFORE UPDATE ON public.access_invocations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: user pays an invocation from wallet
CREATE OR REPLACE FUNCTION public.pay_access_invocation(p_invocation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_inv public.access_invocations%ROWTYPE;
  v_balance numeric;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO v_inv FROM public.access_invocations
  WHERE id = p_invocation_id AND user_id = v_uid FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invocation not found'; END IF;
  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invocation already %', v_inv.status;
  END IF;

  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_inv.amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.wallets SET balance = balance - v_inv.amount, updated_at = now()
  WHERE user_id = v_uid;

  UPDATE public.access_invocations
  SET status = 'paid', paid_at = now(), updated_at = now()
  WHERE id = p_invocation_id;

  RETURN json_build_object('status','paid','amount', v_inv.amount);
END;
$$;

-- RPC: admin approves a paid invocation -> grants app_access unlock
CREATE OR REPLACE FUNCTION public.approve_access_invocation(p_invocation_id uuid, p_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.access_invocations%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_inv FROM public.access_invocations
  WHERE id = p_invocation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_inv.status <> 'paid' THEN
    RAISE EXCEPTION 'Only paid invocations can be approved';
  END IF;

  INSERT INTO public.user_unlocks (user_id, unlock_type, expires_at)
  VALUES (v_inv.user_id, 'app_access', NULL)
  ON CONFLICT DO NOTHING;

  UPDATE public.access_invocations
  SET status = 'approved', resolved_at = now(), resolved_by = auth.uid(),
      admin_notes = COALESCE(p_notes, admin_notes), updated_at = now()
  WHERE id = p_invocation_id;

  RETURN json_build_object('status','approved');
END;
$$;

-- RPC: admin declines (refunds if paid)
CREATE OR REPLACE FUNCTION public.decline_access_invocation(p_invocation_id uuid, p_notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.access_invocations%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_inv FROM public.access_invocations
  WHERE id = p_invocation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_inv.status NOT IN ('pending','paid') THEN
    RAISE EXCEPTION 'Cannot decline %', v_inv.status;
  END IF;

  IF v_inv.status = 'paid' THEN
    UPDATE public.wallets SET balance = balance + v_inv.amount, updated_at = now()
    WHERE user_id = v_inv.user_id;
  END IF;

  UPDATE public.access_invocations
  SET status = 'declined', resolved_at = now(), resolved_by = auth.uid(),
      admin_notes = COALESCE(p_notes, admin_notes), updated_at = now()
  WHERE id = p_invocation_id;

  RETURN json_build_object('status','declined','refunded', v_inv.status = 'paid');
END;
$$;