CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  recipient_email text NOT NULL,
  email_type text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'pending',
  provider_message_id text,
  error_message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_user ON public.email_send_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_type ON public.email_send_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs"
  ON public.email_send_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own email logs"
  ON public.email_send_log FOR SELECT
  USING (auth.uid() = user_id);
