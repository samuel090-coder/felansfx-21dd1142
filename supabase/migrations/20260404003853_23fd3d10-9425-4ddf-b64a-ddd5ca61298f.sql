
-- Add phone_number and transaction_pin_hash to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transaction_pin_hash text DEFAULT NULL;

-- Function to set/update transaction PIN (hashed with pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_transaction_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(p_pin) <> 4 OR p_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  UPDATE public.profiles
  SET transaction_pin_hash = crypt(p_pin, gen_salt('bf')),
      updated_at = now()
  WHERE user_id = auth.uid();

  RETURN true;
END;
$$;

-- Function to verify transaction PIN
CREATE OR REPLACE FUNCTION public.verify_transaction_pin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT transaction_pin_hash INTO v_hash
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF v_hash IS NULL THEN
    RAISE EXCEPTION 'No transaction PIN set. Please set one in your profile.';
  END IF;

  RETURN v_hash = crypt(p_pin, v_hash);
END;
$$;
