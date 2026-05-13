import { Seo } from "@/components/Seo";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { PostCard } from "@/components/feed/PostCard";
import { CreatePostSheet } from "@/components/feed/CreatePostSheet";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const Feed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    // Realtime
    const channel = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Seo
        title="Community Feed — Felans FX"
        description="See trade ideas, results and discussion from the Felans FX trading community."
        path="/feed"
      />
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-lg font-bold flex-1">Community Feed</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate("/chat-rooms")}>
          <MessageSquare className="w-5 h-5" />
        </Button>
      </div>

      {/* Posts */}
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No posts yet. Be the first! 🔥</p>
          </div>
        ) : (
          posts.map(post => <PostCard key={post.id} post={post} onRefresh={fetchPosts} />)
        )}
      </div>

      {/* FAB */}
      {user && (
        <Button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-24 right-4 z-50 rounded-full w-14 h-14 shadow-lg"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

      <CreatePostSheet open={showCreate} onOpenChange={setShowCreate} onCreated={fetchPosts} />
    </div>
  );
};

export default Feed;
