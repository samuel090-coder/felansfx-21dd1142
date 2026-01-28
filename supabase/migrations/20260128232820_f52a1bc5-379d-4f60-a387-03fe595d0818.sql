-- 1) Add admin check to credit_user_wallet to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.credit_user_wallet(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Enforce admin role before crediting
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Admin role required to credit wallets';
    END IF;

    -- Validate amount
    IF p_amount <= 0 THEN
      RAISE EXCEPTION 'Invalid amount: must be greater than zero';
    END IF;

    UPDATE public.wallets
    SET balance = balance + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

-- 2) Add admin check to deduct_user_wallet for consistency (already called from client)
-- This doesn't need admin check because users deduct from their own wallet
-- But ensure the function validates p_amount > 0
CREATE OR REPLACE FUNCTION public.deduct_user_wallet(p_user_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_balance numeric;
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
      RETURN false;
    END IF;

    -- Ensure caller can only deduct from own wallet
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
      -- Allow admin to deduct from any wallet
      IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
      ) THEN
        RETURN false;
      END IF;
    END IF;

    -- Get current balance
    SELECT balance INTO current_balance
    FROM public.wallets
    WHERE user_id = p_user_id;

    -- Check if user has enough balance
    IF current_balance IS NULL OR current_balance < p_amount THEN
        RETURN false;
    END IF;

    -- Deduct from wallet
    UPDATE public.wallets
    SET balance = balance - p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;

    RETURN true;
END;
$$;