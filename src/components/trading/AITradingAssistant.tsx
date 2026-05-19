import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, TrendingUp, TrendingDown, Zap, Lock, Loader2, RefreshCw, Crown, Calendar, Infinity } from "lucide-react";
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

type PlanKey = "daily" | "6month" | "lifetime";

interface PricingPlan {
  key: PlanKey;
  label: string;
  duration: string;
  icon: React.ReactNode;
  expiryMs: number | null; // null = lifetime
  settingKey: string;
  defaultPrice: number;
}

const PLANS: PricingPlan[] = [
  { key: "daily", label: "Daily", duration: "24 hours", icon: <Calendar className="w-4 h-4" />, expiryMs: 24 * 60 * 60 * 1000, settingKey: "ai_bot_daily_price", defaultPrice: 5000 },
  { key: "6month", label: "6 Months", duration: "180 days", icon: <Crown className="w-4 h-4" />, expiryMs: 180 * 24 * 60 * 60 * 1000, settingKey: "ai_bot_6month_price", defaultPrice: 50000 },
  { key: "lifetime", label: "Lifetime", duration: "Forever", icon: <Infinity className="w-4 h-4" />, expiryMs: null, settingKey: "ai_bot_lifetime_price", defaultPrice: 500000 },
];

export const AITradingAssistant = ({
  open, onOpenChange, selectedSymbol, currentPrice, accountType, onExecuteTrade,
}: AITradingAssistantProps) => {
  const { user } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [isActive, setIsActive] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [signals, setSignals] = useState<AISignal[]>([]);
  const [generating, setGenerating] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<PlanKey | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("daily");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && open) {
      checkSubscription();
      loadPrices();
    }
  }, [user, open]);

  const loadPrices = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["ai_bot_daily_price", "ai_bot_6month_price", "ai_bot_lifetime_price"]);
    if (data) {
      const map: Record<string, number> = {};
      data.forEach(d => { map[d.key] = parseFloat(d.value) || 0; });
      setPrices(map);
    }
  };

  const getPrice = (plan: PricingPlan) => prices[plan.settingKey] || plan.defaultPrice;

  const checkSubscription = async () => {
    if (!user) return;
    // Check for lifetime first (no expiry needed), then time-bound
    const { data } = await supabase
      .from("user_unlocks")
      .select("*")
      .eq("user_id", user.id)
      .eq("unlock_type", "ai_trading_bot")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      // Lifetime: expires_at is null or very far in the future (year 9999)
      const isLifetime = !data.expires_at || new Date(data.expires_at).getFullYear() >= 9000;
      const isValid = isLifetime || new Date(data.expires_at) > new Date();
      setIsActive(isValid);
      setExpiresAt(isLifetime ? "Lifetime" : data.expires_at);
      if (isValid) loadSignals();
    } else {
      setIsActive(false);
      setExpiresAt(null);
    }
  };

  const purchaseBot = async (plan: PricingPlan) => {
    if (!user || !wallet) return;
    const price = getPrice(plan);
    if (wallet.balance < price) {
      toast.error("Insufficient balance", { description: `You need ₦${price.toLocaleString()} to activate AI Bot (${plan.label})` });
      return;
    }
    setPurchaseLoading(plan.key);
    try {
      const { data: ok, error: deductErr } = await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: price });
      if (deductErr) throw new Error(deductErr.message);
      if (!ok) throw new Error("Payment failed — insufficient balance");

      const expiresAt = plan.expiryMs
        ? new Date(Date.now() + plan.expiryMs).toISOString()
        : "9999-12-31T23:59:59.999Z"; // lifetime

      const { error: insertErr } = await supabase.from("user_unlocks").upsert(
        {
          user_id: user.id,
          unlock_type: "ai_trading_bot",
          expires_at: expiresAt,
        },
        { onConflict: "user_id,unlock_type" }
      );

      if (insertErr) {
        // Refund if upsert fails
        console.error("Upsert failed, refunding:", insertErr);
        try { await supabase.rpc("credit_user_wallet_service", { p_user_id: user.id, p_amount: price }); } catch {}
        throw new Error("Purchase failed. Your balance has been refunded.");
      }

      await refetchWallet();
      setIsActive(true);
      setExpiresAt(plan.expiryMs ? expiresAt : "Lifetime");
      toast.success(`🤖 AI Trading Bot activated — ${plan.label}!`);
      loadSignals();
    } catch (e: any) {
      toast.error(e.message || "Purchase failed");
    }
    setPurchaseLoading(null);
  };

  const loadSignals = async () => {
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
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate signal");
    }
    setGenerating(false);
  };

  const executeSignal = (signal: AISignal) => {
    if (!onExecuteTrade) return;
    const amount = accountType === "demo" ? 50 : 100;
    onExecuteTrade(signal.direction.toLowerCase() as "buy" | "sell", amount, 60);
    toast.success(`Executing ${signal.direction} ${signal.symbol}`);
  };

  const formatExpiry = () => {
    if (!expiresAt || expiresAt === "Lifetime") return "Lifetime access";
    const d = new Date(expiresAt);
    if (d.getFullYear() >= 9000) return "Lifetime access";
    const diff = d.getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
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
            <div className="space-y-4 py-2">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold">AI Trading Bot</h3>
                <p className="text-xs text-muted-foreground">
                  AI-powered trade signals, smart entry/exit points & one-tap execution.
                </p>
              </div>

              {/* Features */}
              <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-left">
                <div className="flex items-center gap-2 text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Real-time AI signals
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Smart entry/exit points
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Bot className="w-3.5 h-3.5 text-primary" /> One-tap trade execution
                </div>
              </div>

              {/* Pricing tiers */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground text-center">Choose a plan</p>
                <div className="grid grid-cols-3 gap-2">
                  {PLANS.map(plan => {
                    const price = getPrice(plan);
                    const isSelected = selectedPlan === plan.key;
                    return (
                      <button
                        key={plan.key}
                        onClick={() => setSelectedPlan(plan.key)}
                        className={`rounded-xl p-3 border-2 transition-all text-center ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-muted/30 hover:border-primary/50"
                        }`}
                      >
                        <div className="flex justify-center mb-1 text-primary">{plan.icon}</div>
                        <p className="text-xs font-bold">{plan.label}</p>
                        <p className="text-[10px] text-muted-foreground">{plan.duration}</p>
                        <p className="text-sm font-bold mt-1">₦{price.toLocaleString()}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">Balance: ₦{wallet?.balance?.toLocaleString() || 0}</p>
              </div>

              <Button
                className="w-full gradient-primary font-bold h-12"
                onClick={() => {
                  const plan = PLANS.find(p => p.key === selectedPlan)!;
                  purchaseBot(plan);
                }}
                disabled={purchaseLoading !== null}
              >
                {purchaseLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Activate — ₦{getPrice(PLANS.find(p => p.key === selectedPlan)!).toLocaleString()}
              </Button>
            </div>
          ) : (
            /* Active bot */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                    <Zap className="w-3 h-3 mr-1" /> Bot Active
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{formatExpiry()}</span>
                </div>
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
