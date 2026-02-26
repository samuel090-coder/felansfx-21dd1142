-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert push delivery logs" ON public.push_delivery_logs;