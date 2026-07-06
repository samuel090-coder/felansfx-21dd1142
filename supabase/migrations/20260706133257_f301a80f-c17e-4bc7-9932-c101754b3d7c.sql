-- Payment intents track every Paystack checkout (deposit, app access, AI bot)
CREATE TABLE public.payment_intents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL, -- 'deposit' | 'app_access' | 'ai_bot'
  plan_key text,
  amount numeric NOT NULL,
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'success' | 'failed'
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.payment_intents TO authenticated;
GRANT ALL ON public.payment_intents TO service_role;

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own payment intents"
  ON public.payment_intents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create their own payment intents"
  ON public.payment_intents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Idempotent fulfillment called by the Paystack webhook (service role)
CREATE OR REPLACE FUNCTION public.complete_payment_intent(p_reference text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.payment_intents%ROWTYPE;
  v_expires timestamptz;
  v_invocation_id uuid;
BEGIN
  SELECT * INTO v FROM public.payment_intents WHERE reference = p_reference FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('status', 'not_found');
  END IF;
  IF v.status = 'success' THEN
    RETURN json_build_object('status', 'already_fulfilled');
  END IF;

  IF v.purpose = 'deposit' THEN
    UPDATE public.wallets SET balance = balance + v.amount, updated_at = now()
    WHERE user_id = v.user_id;
    INSERT INTO public.deposits (user_id, amount, screenshot_url, status, admin_notes)
    VALUES (v.user_id, v.amount, 'paystack:' || v.reference, 'approved', 'Paystack auto-credit');

  ELSIF v.purpose = 'app_access' THEN
    INSERT INTO public.user_unlocks (user_id, unlock_type, expires_at)
    VALUES (v.user_id, 'app_access', NULL)
    ON CONFLICT (user_id, unlock_type) DO UPDATE SET expires_at = NULL;

    v_invocation_id := NULLIF(v.metadata->>'invocation_id', '')::uuid;
    IF v_invocation_id IS NOT NULL THEN
      UPDATE public.access_invocations
      SET status = 'approved', resolved_at = now(), updated_at = now()
      WHERE id = v_invocation_id;
    END IF;

  ELSIF v.purpose = 'ai_bot' THEN
    IF v.plan_key = 'daily' THEN
      v_expires := now() + interval '24 hours';
    ELSIF v.plan_key = '6month' THEN
      v_expires := now() + interval '180 days';
    ELSE
      v_expires := '9999-12-31 23:59:59+00'::timestamptz;
    END IF;
    INSERT INTO public.user_unlocks (user_id, unlock_type, expires_at)
    VALUES (v.user_id, 'ai_trading_bot', v_expires)
    ON CONFLICT (user_id, unlock_type) DO UPDATE SET expires_at = EXCLUDED.expires_at;
  END IF;

  UPDATE public.payment_intents SET status = 'success', updated_at = now() WHERE id = v.id;

  RETURN json_build_object('status', 'success', 'purpose', v.purpose);
END;
$$;