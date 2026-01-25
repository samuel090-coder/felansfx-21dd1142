-- Add unique user_id column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;

-- Create function to generate unique 6-digit user ID
CREATE OR REPLACE FUNCTION public.generate_user_display_id()
RETURNS TRIGGER AS $$
DECLARE
    new_id TEXT;
    done BOOLEAN;
BEGIN
    done := FALSE;
    WHILE NOT done LOOP
        new_id := 'FX' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        done := NOT EXISTS (SELECT 1 FROM public.profiles WHERE display_id = new_id);
    END LOOP;
    NEW.display_id := new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate display_id
DROP TRIGGER IF EXISTS generate_display_id_trigger ON public.profiles;
CREATE TRIGGER generate_display_id_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.display_id IS NULL)
EXECUTE FUNCTION public.generate_user_display_id();

-- Update existing profiles without display_id using subquery
UPDATE public.profiles p
SET display_id = 'FX' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0')
WHERE display_id IS NULL;

-- Create secure function to credit wallet (bypasses RLS using SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.credit_user_wallet(
    p_user_id UUID,
    p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.wallets
    SET balance = balance + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users (admin will call this)
GRANT EXECUTE ON FUNCTION public.credit_user_wallet TO authenticated;