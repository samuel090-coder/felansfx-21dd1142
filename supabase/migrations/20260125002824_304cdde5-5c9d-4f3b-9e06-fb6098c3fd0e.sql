-- Add DELETE policy for deposit_methods so admin can delete payment methods
CREATE POLICY "Admins can delete deposit methods"
ON public.deposit_methods
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add INSERT policy for deposit_methods so admin can add payment methods
CREATE POLICY "Admins can insert deposit methods"
ON public.deposit_methods
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add UPDATE policy for deposit_methods so admin can update payment methods
CREATE POLICY "Admins can update deposit methods"
ON public.deposit_methods
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));