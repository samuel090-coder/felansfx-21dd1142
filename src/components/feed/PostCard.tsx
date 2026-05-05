import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { TradePreviewCard } from "./TradePreviewCard";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { sendEmail } from "@/lib/sendEmail";

async function notifyPostAuthor(type: "post_liked" | "post_commented", postUserId: string, fromUserId: string, postId: string, extra: Record<string, any> = {}) {
  if (postUserId === fromUserId) return;
  const { data: ownerProfile } = await supabase.from("profiles").select("email").eq("user_id", postUserId).maybeSingle();
  if (!ownerProfile?.email) return;
  sendEmail({ type, userEmail: ownerProfile.email, userId: fromUserId, shortId: postId, data: extra });
}

interface PostData {
  id: string;
  user_id: string;
  content: string;
  tagged_trade_ids: string[];
  tagged_user_ids: string[];
  image_url: string | null;
  video_url?: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface Props {
  post: PostData;
  onRefresh: () => void;
}

export const PostCard = ({ post, onRefresh }: Props) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [taggedProfiles, setTaggedProfiles] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("full_name, display_id, avatar_url").eq("user_id", post.user_id).maybeSingle().then(({ data }) => setProfile(data));
    supabase.from("kyc_verifications").select("status").eq("user_id", post.user_id).eq("status", "approved").maybeSingle().then(({ data }) => setIsVerified(!!data));
    if (user) {
      supabase.from("post_likes").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle().then(({ data }) => setLiked(!!data));
    }
    if (post.tagged_user_ids?.length) {
      supabase.from("profiles").select("user_id, full_name, display_id").in("user_id", post.tagged_user_ids).then(({ data }) => setTaggedProfiles(data || []));
    }
  }, [post, user]);

  const toggleLike = async () => {
    if (!user) return toast.error("Login to like posts");
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setLiked(false); setLikesCount(c => c - 1);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      setLiked(true); setLikesCount(c => c + 1);
      notifyPostAuthor("post_liked", post.user_id, user.id, post.id);
    }
  };

  const loadComments = async () => {
    const { data } = await supabase.from("post_comments").select("*").eq("post_id", post.id).order("created_at", { ascending: true });
    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, display_id, avatar_url").in("user_id", userIds);
      const { data: kycData } = await supabase.from("kyc_verifications").select("user_id, status").in("user_id", userIds).eq("status", "approved");
      const verifiedSet = new Set((kycData || []).map(k => k.user_id));
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      setComments(data.map(c => ({ ...c, profile: profileMap[c.user_id], isVerified: verifiedSet.has(c.user_id) })));
    }
  };

  const toggleComments = () => { if (!showComments) loadComments(); setShowComments(!showComments); };

  const submitComment = async () => {
    if (!user || !commentText.trim()) return;
    const text = commentText.trim();
    await supabase.from("post_comments").insert({ post_id: post.id, user_id: user.id, content: text });
    notifyPostAuthor("post_commented", post.user_id, user.id, post.id, { comment: text });
    setCommentText(""); loadComments();
  };

  const handleShare = () => {
    const url = `${window.location.origin}/feed`;
    if (navigator.share) navigator.share({ title: "Check this trade post!", url });
    else { navigator.clipboard.writeText(url); toast.success("Link copied!"); }
  };

  const renderContent = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => part.startsWith("@") ? <span key={i} className="text-primary font-medium">{part}</span> : <span key={i}>{part}</span>);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 pb-2">
        <Avatar className="w-10 h-10">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{(profile?.full_name || "U")[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <p className="font-semibold text-sm">{profile?.full_name || profile?.display_id || "Trader"}</p>
            {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-primary" />}
          </div>
          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
        </div>
      </div>

      <div className="px-4 pb-2">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderContent(post.content)}</p>
        {taggedProfiles.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {taggedProfiles.map(tp => (<span key={tp.user_id} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">@{tp.full_name || tp.display_id}</span>))}
          </div>
        )}
      </div>

      {post.tagged_trade_ids?.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          {post.tagged_trade_ids.map(tid => (<TradePreviewCard key={tid} tradeId={tid} />))}
        </div>
      )}

      {post.image_url && (
        <div className="px-4 pb-3">
          <img src={post.image_url} alt="" className="rounded-xl w-full max-h-64 object-cover" />
        </div>
      )}

      {/* Embedded video */}
      {post.video_url && (
        <div className="px-4 pb-3">
          <iframe src={post.video_url} className="w-full aspect-video rounded-xl" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
        </div>
      )}

      <div className="flex items-center border-t border-border px-2">
        <Button variant="ghost" size="sm" className="flex-1 gap-1.5" onClick={toggleLike}>
          <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
          <span className="text-xs">{likesCount}</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 gap-1.5" onClick={toggleComments}>
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs">{post.comments_count}</span>
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 gap-1.5" onClick={handleShare}>
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      {showComments && (
        <div className="border-t border-border p-3 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <Avatar className="w-7 h-7">
                <AvatarImage src={c.profile?.avatar_url} />
                <AvatarFallback className="text-[10px] bg-muted">{(c.profile?.full_name || "U")[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium">{c.profile?.full_name || c.profile?.display_id || "Trader"}</p>
                  {c.isVerified && <ShieldCheck className="w-3 h-3 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">{c.content}</p>
              </div>
            </div>
          ))}
          {user && (
            <div className="flex gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && submitComment()} placeholder="Write a comment..." className="flex-1 text-sm bg-muted/50 rounded-full px-3 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
              <Button size="sm" onClick={submitComment} disabled={!commentText.trim()}>Post</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
