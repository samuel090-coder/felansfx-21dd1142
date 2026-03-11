-- Allow authenticated users to read signal messages by code (for signal code redemption on trading page)
CREATE POLICY "Auth users can read signal messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (message_type = 'signal');