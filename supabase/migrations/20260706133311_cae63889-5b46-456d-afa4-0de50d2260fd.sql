REVOKE ALL ON FUNCTION public.complete_payment_intent(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payment_intent(text) TO service_role;