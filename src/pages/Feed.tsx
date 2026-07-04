import { Seo } from "@/components/Seo";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { PostCard } from "@/components/feed/PostCard";
import { CreatePostSheet } from "@/components/feed/CreatePostSheet";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, MessageSquare, Search, Bell, PenSquare, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "for_you", label: "For You" },
  { id: "following", label: "Following" },
  { id: "top", label: "Top Traders" },
  { id: "news", label: "News" },
] as const;

const CHIPS = [
  { id: "all", label: "All" },
  { id: "idea", label: "Ideas" },
  { id: "trade", label: "Trades" },
  { id: "market_news", label: "Market News" },
  { id: "discussion", label: "Discussions" },
] as const;

const Feed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<string>("for_you");
  const [chip, setChip] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

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
    const channel = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (user) {
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(data === true));
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const visiblePosts = useMemo(() => {
    let list = [...posts];
    // Tabs
    if (tab === "top") list.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    if (tab === "news") list = list.filter(p => (p.category || "discussion") === "market_news");
    // Chips
    if (chip !== "all" && tab !== "news") list = list.filter(p => (p.category || "discussion") === chip);
    // Search
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(p => (p.content || "").toLowerCase().includes(q));
    return list;
  }, [posts, tab, chip, search]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Seo
        title="Community Feed — Felans FX"
        description="See trade ideas, results and discussion from the Felans FX trading community."
        path="/feed"
      />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="p-4 pb-3 flex items-center gap-2 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" className="shrink-0 -ml-2" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-lg font-bold flex-1 truncate">Community Feed</h1>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShowSearch(s => !s)}>
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/notifications")}>
            <Bell className="w-5 h-5" />
          </Button>
          {user && (
            <Button size="sm" className="shrink-0 gap-1.5 rounded-full" onClick={() => setShowCreate(true)}>
              <PenSquare className="w-4 h-4" /> Post
            </Button>
          )}
        </div>

        {showSearch && (
          <div className="px-4 pb-3 max-w-lg mx-auto">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search posts..."
                className="flex-1 min-w-0 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="max-w-lg mx-auto px-4 flex gap-5 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative whitespace-nowrap pb-2.5 text-sm transition-colors",
                tab === t.id ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              {t.label}
              {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {CHIPS.map(c => (
            <button
              key={c.id}
              onClick={() => setChip(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                chip === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
          <div className="shrink-0 flex items-center justify-center rounded-full border border-border bg-card p-2 text-muted-foreground">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
        ) : visiblePosts.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No posts here yet. Be the first! 🔥</p>
          </div>
        ) : (
          visiblePosts.map(post => <PostCard key={post.id} post={post} onRefresh={fetchPosts} isAdmin={isAdmin} />)
        )}
      </div>

      {/* Chat rooms shortcut FAB */}
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
