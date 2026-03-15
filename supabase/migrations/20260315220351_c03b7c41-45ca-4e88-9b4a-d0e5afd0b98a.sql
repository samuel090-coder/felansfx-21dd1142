
-- User reports table
CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.user_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON public.user_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage all reports" ON public.user_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add media_url and media_type columns to chat_messages for file sharing
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text;

-- Create a credit_user_wallet_service function (no admin check, for edge functions only)
CREATE OR REPLACE FUNCTION public.credit_user_wallet_service(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF p_amount <= 0 THEN
      RAISE EXCEPTION 'Invalid amount';
    END IF;
    UPDATE public.wallets
    SET balance = balance + p_amount, updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;
