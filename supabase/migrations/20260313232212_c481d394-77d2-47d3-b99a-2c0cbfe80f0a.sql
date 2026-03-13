
-- Add room settings columns
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS join_price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false;

-- Join requests table
CREATE TABLE IF NOT EXISTS public.room_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(room_id, user_id)
);
ALTER TABLE public.room_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create join requests" ON public.room_join_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own requests" ON public.room_join_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Room creators can manage requests" ON public.room_join_requests FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_join_requests.room_id AND created_by = auth.uid()));

-- Coin flip games table
CREATE TABLE IF NOT EXISTS public.coin_flip_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  opponent_id uuid,
  stake_amount numeric NOT NULL,
  creator_choice text NOT NULL DEFAULT 'heads',
  result text,
  winner_id uuid,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.coin_flip_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view room games" ON public.coin_flip_games FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = coin_flip_games.room_id AND user_id = auth.uid()));
CREATE POLICY "Auth users can create games" ON public.coin_flip_games FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Participants can update games" ON public.coin_flip_games FOR UPDATE TO authenticated USING (creator_id = auth.uid() OR opponent_id = auth.uid());

-- Add video_url column to posts for embedded videos
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_url text;

-- Recreate triggers that are missing
CREATE OR REPLACE TRIGGER on_post_like_change
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

CREATE OR REPLACE TRIGGER on_post_comment_change
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

CREATE OR REPLACE TRIGGER on_room_member_change
  AFTER INSERT OR DELETE ON public.chat_room_members
  FOR EACH ROW EXECUTE FUNCTION public.update_room_members_count();
