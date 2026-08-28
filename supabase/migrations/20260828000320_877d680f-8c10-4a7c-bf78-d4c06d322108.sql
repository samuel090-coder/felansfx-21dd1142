INSERT INTO public.app_settings (key, value) VALUES
  ('payment_bank_name', 'Opay'),
  ('payment_account_number', '9066423764'),
  ('payment_account_name', 'Samuel')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();