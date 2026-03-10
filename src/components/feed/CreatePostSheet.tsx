import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, X, Image as ImageIcon, Smile } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const EMOJI_LIST = ["🔥", "💰", "📈", "📉", "🎯", "💪", "🚀", "⚡", "💎", "🏆", "✅", "❌", "👀", "🤑", "😤"];

export const CreatePostSheet = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [trades, setTrades] = useState<any[]>([]);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [showTrades, setShowTrades] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    supabase
      .from("demo_trade_history")
      .select("id, symbol, trade_type, pnl, pnl_percent, amount, closed_at")
      .eq("user_id", user.id)
      .order("closed_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setTrades(data || []));
  }, [user, open]);

  const toggleTrade = (id: string) => {
    setSelectedTrades(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmoji(false);
  };

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim(),
      tagged_trade_ids: selectedTrades,
    });
    if (error) {
      toast.error("Failed to post");
    } else {
      toast.success("Posted! 🔥");
      setContent("");
      setSelectedTrades([]);
      onOpenChange(false);
      onCreated();
    }
    setPosting(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Create Post</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-4 h-full">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind? Share your trading journey... 📈"
            className="min-h-[120px] resize-none"
          />

          {/* Selected trades preview */}
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

          {/* Actions bar */}
          <div className="flex items-center gap-2">
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
              {EMOJI_LIST.map(e => (
                <button key={e} onClick={() => addEmoji(e)} className="text-xl hover:scale-125 transition-transform">{e}</button>
              ))}
            </div>
          )}

          {/* Trade selector */}
          {showTrades && (
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {trades.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTrade(t.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      selectedTrades.includes(t.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {t.pnl > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                      <span className="font-medium text-sm">{t.symbol}</span>
                      <Badge variant="outline" className="text-[10px]">{t.trade_type.toUpperCase()}</Badge>
                    </div>
                    <span className={`text-sm font-bold ${t.pnl > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {t.pnl > 0 ? '+' : ''}{t.pnl.toFixed(2)}
                    </span>
                  </button>
                ))}
                {trades.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No trade history yet</p>}
              </div>
            </ScrollArea>
          )}

          <Button onClick={handlePost} disabled={posting || !content.trim()} className="mt-auto mb-4">
            {posting ? "Posting..." : "Post 🔥"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
