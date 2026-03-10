import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Share2, TrendingUp, TrendingDown, Clock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface TradeRecord {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price: number;
  amount: number;
  pnl: number;
  pnl_percent: number;
  duration_seconds: number | null;
  opened_at: string;
  closed_at: string;
  close_reason: string | null;
  account_type: string;
  user_id: string;
}

const TradeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trade, setTrade] = useState<TradeRecord | null>(null);
  const [traderName, setTraderName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchTrade = async () => {
      const { data, error } = await supabase
        .from("demo_trade_history")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setTrade(data);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, display_id")
          .eq("user_id", data.user_id)
          .maybeSingle();
        setTraderName(profile?.full_name || profile?.display_id || "Trader");
      }
      setLoading(false);
    };
    fetchTrade();
  }, [id]);

  const isWin = trade && trade.pnl > 0;
  const shareLink = `${window.location.origin}/trade/${id}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `Trade on ${trade?.symbol}`, url: shareLink });
    } else {
      navigator.clipboard.writeText(shareLink);
      toast.success("Link copied!");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!trade) return <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4"><p className="text-muted-foreground">Trade not found</p><Button onClick={() => navigate(-1)}>Go Back</Button></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-lg font-semibold flex-1">Trade Detail</h1>
        <Button variant="ghost" size="icon" onClick={handleShare}><Share2 className="w-5 h-5" /></Button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        <Card className={`border-2 ${isWin ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isWin ? <TrendingUp className="w-6 h-6 text-green-500" /> : <TrendingDown className="w-6 h-6 text-red-500" />}
                <span className="text-xl font-bold">{trade.symbol}</span>
              </div>
              <Badge variant={isWin ? "default" : "destructive"} className={isWin ? "bg-green-500/20 text-green-500 border-green-500/30" : ""}>
                {trade.trade_type.toUpperCase()}
              </Badge>
            </div>

            <div className={`text-center py-4 rounded-xl ${isWin ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <p className="text-sm text-muted-foreground">Profit / Loss</p>
              <p className={`text-3xl font-bold ${isWin ? 'text-green-500' : 'text-red-500'}`}>
                {isWin ? '+' : ''}{trade.pnl.toFixed(2)}
              </p>
              <p className={`text-sm ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                {isWin ? '+' : ''}{trade.pnl_percent.toFixed(1)}%
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground">Entry</p>
                <p className="font-semibold">{trade.entry_price}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground">Exit</p>
                <p className="font-semibold">{trade.exit_price}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground">Amount</p>
                <p className="font-semibold">${trade.amount.toFixed(2)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground">Duration</p>
                <p className="font-semibold">{trade.duration_seconds ? `${trade.duration_seconds}s` : '-'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              <span>by {traderName}</span>
              <span>{format(new Date(trade.closed_at), "MMM d, yyyy HH:mm")}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" /> Share Trade
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(shareLink); toast.success("Copied!"); }}>
            <Copy className="w-4 h-4 mr-2" /> Copy Link
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TradeDetail;
