-- Create a secure function to deduct from user wallet (for analysis cost)
CREATE OR REPLACE FUNCTION public.deduct_user_wallet(p_user_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_balance numeric;
BEGIN
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