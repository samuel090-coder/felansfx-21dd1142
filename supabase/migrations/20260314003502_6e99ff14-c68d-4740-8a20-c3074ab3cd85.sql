
-- P2P fund transfers table
CREATE TABLE IF NOT EXISTS public.fund_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fund_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transfers" ON public.fund_transfers FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Auth users can create transfers" ON public.fund_transfers FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Money requests table
CREATE TABLE IF NOT EXISTS public.money_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_id uuid NOT NULL,
  amount numeric NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending',
  room_id uuid REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.money_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.money_requests FOR SELECT TO authenticated USING (auth.uid() = requester_id OR auth.uid() = target_id);
CREATE POLICY "Auth users can create requests" ON public.money_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Target can update requests" ON public.money_requests FOR UPDATE TO authenticated USING (auth.uid() = target_id);

-- Jackpot wheel games table
CREATE TABLE IF NOT EXISTS public.jackpot_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'open',
  total_pot numeric NOT NULL DEFAULT 0,
  winner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  min_entry numeric NOT NULL DEFAULT 50,
  max_players integer NOT NULL DEFAULT 6
);
ALTER TABLE public.jackpot_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view jackpot games" ON public.jackpot_games FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = jackpot_games.room_id AND user_id = auth.uid()));
CREATE POLICY "Auth users can create jackpot" ON public.jackpot_games FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Participants can update jackpot" ON public.jackpot_games FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = jackpot_games.room_id AND user_id = auth.uid()));

-- Jackpot entries
CREATE TABLE IF NOT EXISTS public.jackpot_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.jackpot_games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(game_id, user_id)
);
ALTER TABLE public.jackpot_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view entries" ON public.jackpot_entries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.jackpot_games jg JOIN public.chat_room_members crm ON crm.room_id = jg.room_id WHERE jg.id = jackpot_entries.game_id AND crm.user_id = auth.uid()));
CREATE POLICY "Auth users can enter" ON public.jackpot_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Recreate triggers
CREATE OR REPLACE TRIGGER on_post_like_change
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

CREATE OR REPLACE TRIGGER on_post_comment_change
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

CREATE OR REPLACE TRIGGER on_room_member_change
  AFTER INSERT OR DELETE ON public.chat_room_members
  FOR EACH ROW EXECUTE FUNCTION public.update_room_members_count();
