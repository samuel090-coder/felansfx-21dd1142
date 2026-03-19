import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, TrendingUp, TrendingDown, Zap, Lock, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface AISignal {
  symbol: string;
  direction: "BUY" | "SELL";
  confidence: number;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  reasoning: string;
  timeframe: string;
}

interface AITradingAssistantProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selectedSymbol: string;
  currentPrice: number;
  accountType: "demo" | "real";
  onExecuteTrade?: (type: "buy" | "sell", amount: number, duration: number) => void;
}

const BOT_PRICE = 2000; // ₦2,000 per day

export const AITradingAssistant = ({
  open, onOpenChange, selectedSymbol, currentPrice, accountType, onExecuteTrade,
}: AITradingAssistantProps) => {
  const { user } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signals, setSignals] = useState<AISignal[]>([]);
  const [generating, setGenerating] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  useEffect(() => {
    if (user && open) checkSubscription();
  }, [user, open]);

  const checkSubscription = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_unlocks")
      .select("*")
      .eq("user_id", user.id)
      .eq("unlock_type", "ai_trading_bot")
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();
    setIsActive(!!data);
    if (data) loadSignals();
  };

  const purchaseBot = async () => {
    if (!user || !wallet) return;
    if (wallet.balance < BOT_PRICE) {
      toast.error("Insufficient balance", { description: `You need ₦${BOT_PRICE.toLocaleString()} to activate AI Bot` });
      return;
    }
    setPurchaseLoading(true);
    try {
      const { data: ok } = await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: BOT_PRICE });
      if (!ok) throw new Error("Payment failed");

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("user_unlocks").insert({
        user_id: user.id, unlock_type: "ai_trading_bot", expires_at: expiresAt,
      });

      refetchWallet();
      setIsActive(true);
      toast.success("🤖 AI Trading Bot activated for 24 hours!");
      loadSignals();
    } catch (e: any) { toast.error(e.message); }
    setPurchaseLoading(false);
  };

  const loadSignals = async () => {
    // Load any cached signals
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("ai_signals")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(5);
      if (data && data.length > 0) {
        setSignals(data.map(s => ({
          symbol: s.symbol,
          direction: s.signal_type as "BUY" | "SELL",
          confidence: s.confidence,
          entry: s.entry_price?.toString() || "—",
          stopLoss: s.stop_loss?.toString() || "—",
          takeProfit: s.take_profit?.toString() || "—",
          reasoning: s.analysis || "",
          timeframe: "5m",
        })));
      }
    } catch {}
    setLoading(false);
  };

  const generateSignal = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-trading-bot", {
        body: { symbol: selectedSymbol, current_price: currentPrice },
      });
      if (error) throw error;
      if (data?.signal) {
        setSignals(prev => [data.signal, ...prev.slice(0, 4)]);
        toast.success("New AI signal generated!");
      }
    } catch (e: any) {
      toast.error("Failed to generate signal");
    }
    setGenerating(false);
  };

  const executeSignal = (signal: AISignal) => {
    if (!onExecuteTrade) return;
    const amount = accountType === "demo" ? 50 : 100;
    onExecuteTrade(signal.direction.toLowerCase() as "buy" | "sell", amount, 60);
    toast.success(`Executing ${signal.direction} ${signal.symbol}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" /> AI Trading Assistant
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {!isActive ? (
            /* Purchase screen */
            <div className="text-center space-y-4 py-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">AI Trading Bot</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Get AI-powered trade signals, market analysis, and auto-execute suggestions in real-time.
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-amber-500" /> Real-time AI signals
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Smart entry/exit points
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Bot className="w-4 h-4 text-primary" /> One-tap trade execution
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-2xl font-bold">₦{BOT_PRICE.toLocaleString()}<span className="text-sm font-normal text-muted-foreground"> / 24 hours</span></p>
                <p className="text-xs text-muted-foreground mt-1">Balance: ₦{wallet?.balance?.toLocaleString() || 0}</p>
              </div>
              <Button
                className="w-full gradient-primary font-bold h-12"
                onClick={purchaseBot}
                disabled={purchaseLoading}
              >
                {purchaseLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                Activate AI Bot — ₦{BOT_PRICE.toLocaleString()}
              </Button>
            </div>
          ) : (
            /* Active bot */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                  <Zap className="w-3 h-3 mr-1" /> Bot Active
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateSignal}
                  disabled={generating}
                  className="h-7 text-xs"
                >
                  {generating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  {generating ? "Analyzing..." : `Analyze ${selectedSymbol}`}
                </Button>
              </div>

              {loading && <p className="text-center text-sm text-muted-foreground">Loading signals...</p>}

              {signals.length === 0 && !loading && (
                <div className="text-center py-6">
                  <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No signals yet. Click "Analyze" to generate one!</p>
                </div>
              )}

              {signals.map((signal, i) => (
                <div key={i} className="bg-muted/50 rounded-xl p-4 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {signal.direction === "BUY" ? (
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-bold">{signal.symbol}</span>
                      <Badge variant={signal.direction === "BUY" ? "default" : "destructive"} className="text-xs">
                        {signal.direction}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {signal.confidence}% confidence
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-background rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">Entry</p>
                      <p className="font-mono font-bold">{signal.entry}</p>
                    </div>
                    <div className="bg-background rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">SL</p>
                      <p className="font-mono font-bold text-red-500">{signal.stopLoss}</p>
                    </div>
                    <div className="bg-background rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">TP</p>
                      <p className="font-mono font-bold text-emerald-500">{signal.takeProfit}</p>
                    </div>
                  </div>

                  {signal.reasoning && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{signal.reasoning}</p>
                  )}

                  <Button
                    size="sm"
                    className="w-full h-9"
                    onClick={() => executeSignal(signal)}
                  >
                    <Zap className="w-3 h-3 mr-1" /> Execute {signal.direction} Trade
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
