-- 1) De-dupe push_subscriptions by (user_id, endpoint)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id, endpoint ORDER BY created_at DESC) AS rn
  FROM public.push_subscriptions
)
DELETE FROM public.push_subscriptions p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- 2) Prevent future duplicates for the same device endpoint
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_endpoint_uidx
  ON public.push_subscriptions (user_id, endpoint);

-- 3) Track when a user must be automatically re-subscribed (no manual refresh)
CREATE TABLE IF NOT EXISTS public.push_resubscribe_flags (
  user_id UUID PRIMARY KEY,
  reason TEXT,
  last_status_code INTEGER,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_resubscribe_flags ENABLE ROW LEVEL SECURITY;

-- Policies (Postgres doesn't support CREATE POLICY IF NOT EXISTS)
DROP POLICY IF EXISTS "Users can read their own push resubscribe flag" ON public.push_resubscribe_flags;
CREATE POLICY "Users can read their own push resubscribe flag"
  ON public.push_resubscribe_flags
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own push resubscribe flag" ON public.push_resubscribe_flags;
CREATE POLICY "Users can delete their own push resubscribe flag"
  ON public.push_resubscribe_flags
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4) Store failed delivery details for Admin diagnostics
CREATE TABLE IF NOT EXISTS public.push_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  subscription_id UUID,
  endpoint_host TEXT,
  status_code INTEGER,
  is_gone BOOLEAN NOT NULL DEFAULT false,
  is_auth_error BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  title TEXT,
  message TEXT
);

CREATE INDEX IF NOT EXISTS push_delivery_logs_created_at_idx
  ON public.push_delivery_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS push_delivery_logs_user_id_idx
  ON public.push_delivery_logs (user_id);

ALTER TABLE public.push_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view push delivery logs" ON public.push_delivery_logs;
CREATE POLICY "Admins can view push delivery logs"
  ON public.push_delivery_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Keep updated_at current for flags
DROP TRIGGER IF EXISTS trg_push_resubscribe_flags_updated_at ON public.push_resubscribe_flags;
CREATE TRIGGER trg_push_resubscribe_flags_updated_at
BEFORE UPDATE ON public.push_resubscribe_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();