
-- Add cover_image_url to chat_rooms
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Create blocked members table
CREATE TABLE IF NOT EXISTS public.chat_room_blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  blocked_by uuid NOT NULL,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

ALTER TABLE public.chat_room_blocked_users ENABLE ROW LEVEL SECURITY;

-- Room creators (admins) and blocked users can view
CREATE POLICY "Room creators can manage blocks" ON public.chat_room_blocked_users
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND created_by = auth.uid()));

CREATE POLICY "Users can see if they are blocked" ON public.chat_room_blocked_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Fix: Add trigger to auto-update posts.likes_count on insert/delete
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON public.post_likes;
CREATE TRIGGER trigger_update_post_likes_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Fix: Add trigger to auto-update posts.comments_count on insert/delete
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_post_comments_count ON public.post_comments;
CREATE TRIGGER trigger_update_post_comments_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- Add trigger to update chat_rooms.members_count
CREATE OR REPLACE FUNCTION public.update_room_members_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.chat_rooms SET members_count = members_count + 1 WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.chat_rooms SET members_count = GREATEST(0, members_count - 1) WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_room_members_count ON public.chat_room_members;
CREATE TRIGGER trigger_update_room_members_count
  AFTER INSERT OR DELETE ON public.chat_room_members
  FOR EACH ROW EXECUTE FUNCTION public.update_room_members_count();

-- Allow profiles to be read by authenticated users (for chat/feed display)
CREATE POLICY "Authenticated users can view profiles for display" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
