
-- KYC verification table
CREATE TABLE public.kyc_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  verification_type TEXT NOT NULL DEFAULT 'bvn',
  id_number TEXT,
  full_name TEXT,
  date_of_birth TEXT,
  selfie_url TEXT,
  id_document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own KYC" ON public.kyc_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own KYC" ON public.kyc_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending KYC" ON public.kyc_verifications
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all KYC" ON public.kyc_verifications
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all KYC" ON public.kyc_verifications
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Add auto_approve_threshold to app_settings
INSERT INTO public.app_settings (key, value) 
VALUES ('auto_approve_threshold', '0')
ON CONFLICT DO NOTHING;
