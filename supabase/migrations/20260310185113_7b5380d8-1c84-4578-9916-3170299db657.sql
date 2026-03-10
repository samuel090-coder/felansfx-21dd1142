
-- Allow anyone to view individual trade records (for shared links)
CREATE POLICY "Anyone can view trade records" ON public.demo_trade_history FOR SELECT USING (true);
