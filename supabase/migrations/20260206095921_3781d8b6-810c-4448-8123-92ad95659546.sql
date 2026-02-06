-- Add missing write policies for push_resubscribe_flags (no IF NOT EXISTS support for policies)

DROP POLICY IF EXISTS "Users can insert own push resubscribe flag" ON public.push_resubscribe_flags;
DROP POLICY IF EXISTS "Users can update own push resubscribe flag" ON public.push_resubscribe_flags;
DROP POLICY IF EXISTS "Admins can insert push resubscribe flags" ON public.push_resubscribe_flags;
DROP POLICY IF EXISTS "Admins can update push resubscribe flags" ON public.push_resubscribe_flags;

CREATE POLICY "Users can insert own push resubscribe flag"
ON public.push_resubscribe_flags
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push resubscribe flag"
ON public.push_resubscribe_flags
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert push resubscribe flags"
ON public.push_resubscribe_flags
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update push resubscribe flags"
ON public.push_resubscribe_flags
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
