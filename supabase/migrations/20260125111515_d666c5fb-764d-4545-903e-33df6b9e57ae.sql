-- Remove duplicate push subscriptions keeping the most recent one per (user_id, endpoint)
DELETE FROM public.push_subscriptions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, endpoint) id
  FROM public.push_subscriptions
  ORDER BY user_id, endpoint, created_at DESC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.push_subscriptions
ADD CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint);

-- Add admin delete policy for cleanup
CREATE POLICY "Admins can delete push subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));