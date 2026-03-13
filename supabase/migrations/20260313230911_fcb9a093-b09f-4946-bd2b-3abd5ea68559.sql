
-- Recreate triggers for post likes count
CREATE OR REPLACE TRIGGER on_post_like_change
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_likes_count();

-- Recreate triggers for post comments count
CREATE OR REPLACE TRIGGER on_post_comment_change
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_comments_count();

-- Recreate trigger for room members count
CREATE OR REPLACE TRIGGER on_room_member_change
  AFTER INSERT OR DELETE ON public.chat_room_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_room_members_count();
