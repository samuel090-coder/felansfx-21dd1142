-- Fix: Allow admins to INSERT into push_delivery_logs
CREATE POLICY "Admins can insert push delivery logs"
ON public.push_delivery_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also allow service role inserts (edge functions using service role key)
-- by adding a policy that allows insert when the role is service_role
CREATE POLICY "Service role can insert push delivery logs"
ON public.push_delivery_logs
FOR INSERT
WITH CHECK (true);

-- Create notification_preferences table for daily notification settings
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  morning_brief boolean NOT NULL DEFAULT true,
  midday_opportunities boolean NOT NULL DEFAULT true,
  evening_recap boolean NOT NULL DEFAULT true,
  preferred_pairs text[] NOT NULL DEFAULT ARRAY['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY', 'NAS100'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all preferences"
ON public.notification_preferences FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications table (for daily auto notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;