import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, X, Image as ImageIcon, Smile, Video, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const EMOJI_LIST = ["🔥", "💰", "📈", "📉", "🎯", "💪", "🚀", "⚡", "💎", "🏆", "✅", "❌", "👀", "🤑", "😤"];

const CATEGORIES = [
  { id: "discussion", label: "Discussion" },
  { id: "idea", label: "Trade Idea" },
  { id: "trade", label: "Trade" },
  { id: "market_news", label: "Market Update" },
];

const extractVideoEmbed = (url: string): string | null => {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // TikTok
  const tiktokMatch = url.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/);
  if (tiktokMatch) return `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
  return null;
};

export const CreatePostSheet = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("discussion");
  const [trades, setTrades] = useState<any[]>([]);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [showTrades, setShowTrades] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [posting, setPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !open) return;
    supabase.from("demo_trade_history").select("id, symbol, trade_type, pnl, pnl_percent, amount, closed_at").eq("user_id", user.id).order("closed_at", { ascending: false }).limit(20).then(({ data }) => setTrades(data || []));
  }, [user, open]);

  const toggleTrade = (id: string) => setSelectedTrades(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  const addEmoji = (emoji: string) => { setContent(prev => prev + emoji); setShowEmoji(false); };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10MB");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoUrlChange = (url: string) => {
    setVideoUrl(url);
    const embed = extractVideoEmbed(url);
    setEmbedUrl(embed);
  };

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setPosting(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      setUploading(true);
      const ext = imageFile.name.split(".").pop();
      const path = `posts/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("uploads").upload(path, imageFile, { upsert: true });
      if (error) { toast.error("Image upload failed"); setPosting(false); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
      imageUrl = urlData.publicUrl;
      setUploading(false);
    }

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim(),
      category,
      tagged_trade_ids: selectedTrades,
      image_url: imageUrl,
      video_url: embedUrl || null,
    } as any);
    if (error) {
      toast.error("Failed to post");
    } else {
      toast.success("Posted! 🔥");
      setContent(""); setCategory("discussion"); setSelectedTrades([]); setImageFile(null); setImagePreview(null); setVideoUrl(""); setEmbedUrl(null); setShowVideoInput(false);
      onOpenChange(false);
      onCreated();
    }
    setPosting(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader><SheetTitle>Create Post</SheetTitle></SheetHeader>
        <div className="flex flex-col gap-4 mt-4 h-full overflow-y-auto">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Post type</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    category === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What's on your mind? Share your trading journey... 📈" className="min-h-[100px] resize-none" />


          {/* Image preview */}
          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} alt="" className="rounded-xl w-full max-h-40 object-cover" />
              <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 bg-background/80 rounded-full p-1"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Video preview */}
          {embedUrl && (
            <div className="relative">
              <iframe src={embedUrl} className="w-full h-40 rounded-xl" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              <button onClick={() => { setVideoUrl(""); setEmbedUrl(null); setShowVideoInput(false); }} className="absolute top-2 right-2 bg-background/80 rounded-full p-1"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Video URL input */}
          {showVideoInput && !embedUrl && (
            <div className="space-y-1">
              <Input value={videoUrl} onChange={e => handleVideoUrlChange(e.target.value)} placeholder="Paste YouTube, Vimeo, or TikTok URL..." className="text-xs" />
              {videoUrl && !embedUrl && <p className="text-[10px] text-red-500">Invalid video URL. Supported: YouTube, Vimeo, TikTok</p>}
            </div>
          )}

          {/* Selected trades */}
          {selectedTrades.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTrades.map(tid => {
                const t = trades.find(tr => tr.id === tid);
                if (!t) return null;
                return (
                  <Badge key={tid} variant="outline" className="gap-1 pr-1">
                    {t.pnl > 0 ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                    {t.symbol}
                    <button onClick={() => toggleTrade(tid)}><X className="w-3 h-3" /></button>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild><span><ImageIcon className="w-4 h-4 mr-1" /> Photo</span></Button>
              <input type="file" accept="image/*,video/*" className="hidden" onChange={handleImageSelect} />
            </label>
            <Button variant="outline" size="sm" onClick={() => setShowVideoInput(!showVideoInput)}>
              <Video className="w-4 h-4 mr-1" /> Video
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowTrades(!showTrades)}>
              <TrendingUp className="w-4 h-4 mr-1" /> Tag Trade
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowEmoji(!showEmoji)}>
              <Smile className="w-4 h-4 mr-1" /> Emoji
            </Button>
          </div>

          {/* Emoji picker */}
          {showEmoji && (
            <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-xl">
              {EMOJI_LIST.map(e => (<button key={e} onClick={() => addEmoji(e)} className="text-xl hover:scale-125 transition-transform">{e}</button>))}
            </div>
          )}

          {/* Trade selector */}
          {showTrades && (
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {trades.map(t => (
                  <button key={t.id} onClick={() => toggleTrade(t.id)} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${selectedTrades.includes(t.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                    <div className="flex items-center gap-2">
                      {t.pnl > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                      <span className="font-medium text-sm">{t.symbol}</span>
                      <Badge variant="outline" className="text-[10px]">{t.trade_type.toUpperCase()}</Badge>
                    </div>
                    <span className={`text-sm font-bold ${t.pnl > 0 ? 'text-green-500' : 'text-red-500'}`}>{t.pnl > 0 ? '+' : ''}{t.pnl.toFixed(2)}</span>
                  </button>
                ))}
                {trades.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No trade history yet</p>}
              </div>
            </ScrollArea>
          )}

          <Button onClick={handlePost} disabled={posting || uploading || !content.trim()} className="mt-auto mb-4">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Uploading...</> : posting ? "Posting..." : "Post 🔥"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
