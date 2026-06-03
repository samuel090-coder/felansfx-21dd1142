import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, TrendingUp, TrendingDown, Zap, Lock, Loader2, RefreshCw, Crown, Calendar, Infinity as InfinityIcon, Upload, Copy, Building2 } from "lucide-react";
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
  /** Force the purchase/renew view even when a subscription is still active (e.g. daily trade limit reached). */
  forceRenew?: boolean;
}

type PlanKey = "daily" | "6month" | "lifetime";

interface PricingPlan {
  key: PlanKey;
  label: string;
  duration: string;
  icon: React.ReactNode;
  expiryMs: number | null;
  settingKey: string;
  defaultPrice: number;
  requiresBankTransfer: boolean;
}

const PLANS: PricingPlan[] = [
  { key: "daily", label: "Daily", duration: "24 hours", icon: <Calendar className="w-4 h-4" />, expiryMs: 24 * 60 * 60 * 1000, settingKey: "ai_bot_daily_price", defaultPrice: 5000, requiresBankTransfer: false },
  { key: "6month", label: "6 Months", duration: "180 days", icon: <Crown className="w-4 h-4" />, expiryMs: 180 * 24 * 60 * 60 * 1000, settingKey: "ai_bot_6month_price", defaultPrice: 50000, requiresBankTransfer: true },
  { key: "lifetime", label: "Lifetime", duration: "Forever", icon: <InfinityIcon className="w-4 h-4" />, expiryMs: null, settingKey: "ai_bot_lifetime_price", defaultPrice: 500000, requiresBankTransfer: true },
];

interface BankMethod { id: string; name: string; details: string; }

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
  const [methods, setMethods] = useState<BankMethod[]>([]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<{ plan_key: string; amount: number } | null>(null);

  useEffect(() => {
    if (user && open) {
      checkSubscription();
      loadPrices();
      loadMethods();
      checkPendingPurchase();
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

  const loadMethods = async () => {
    const { data } = await supabase
      .from("deposit_methods")
      .select("id, name, details")
      .eq("is_active", true);
    setMethods((data as BankMethod[]) || []);
  };

  const checkPendingPurchase = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_bot_purchases")
      .select("plan_key, amount, status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPendingPurchase(data ? { plan_key: data.plan_key, amount: Number(data.amount) } : null);
  };

  const getPrice = (plan: PricingPlan) => prices[plan.settingKey] || plan.defaultPrice;

  const checkSubscription = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_unlocks")
      .select("*")
      .eq("user_id", user.id)
      .eq("unlock_type", "ai_trading_bot")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
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

  // Daily plan only — uses wallet balance
  const purchaseDaily = async () => {
    const plan = PLANS.find(p => p.key === "daily")!;
    if (!user || !wallet) return;
    const price = getPrice(plan);
    if (wallet.balance < price) {
      toast.error("Insufficient balance", { description: `You need ₦${price.toLocaleString()} to activate the Daily AI Bot. Top up to renew.` });
      return;
    }
    setPurchaseLoading("daily");
    try {
      const { data: ok, error: deductErr } = await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: price });
      if (deductErr) throw new Error(deductErr.message);
      if (!ok) throw new Error("Payment failed — insufficient balance");

      const expiresAtIso = new Date(Date.now() + plan.expiryMs!).toISOString();
      const { error: insertErr } = await supabase.from("user_unlocks").upsert(
        { user_id: user.id, unlock_type: "ai_trading_bot", expires_at: expiresAtIso },
        { onConflict: "user_id,unlock_type" }
      );
      if (insertErr) {
        try { await supabase.rpc("credit_user_wallet_service", { p_user_id: user.id, p_amount: price }); } catch {}
        throw new Error("Activation failed. Your balance has been refunded.");
      }
      await refetchWallet();
      setIsActive(true);
      setExpiresAt(expiresAtIso);
      toast.success("🤖 Daily AI Bot activated — valid 24 hours");
      loadSignals();
    } catch (e: any) {
      toast.error(e.message || "Purchase failed");
    }
    setPurchaseLoading(null);
  };

  // 6-month / lifetime — bank transfer + screenshot upload
  const submitBankTransfer = async () => {
    if (!user) return;
    const plan = PLANS.find(p => p.key === selectedPlan)!;
    if (!plan.requiresBankTransfer) return;
    if (!screenshot) {
      toast.error("Please upload your payment screenshot");
      return;
    }
    setPurchaseLoading(plan.key);
    try {
      const ext = screenshot.name.split(".").pop() || "jpg";
      const path = `ai-bot-purchases/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, screenshot, {
        cacheControl: "3600", upsert: false,
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);

      const { error: insErr } = await supabase.from("ai_bot_purchases").insert({
        user_id: user.id,
        plan_key: plan.key,
        amount: getPrice(plan),
        screenshot_url: urlData.publicUrl,
        status: "pending",
      });
      if (insErr) throw insErr;

      toast.success("Payment submitted — awaiting admin approval");
      setScreenshot(null);
      await checkPendingPurchase();
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    }
    setPurchaseLoading(null);
  };

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };

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
    if (diff <= 0) return "Expired — renew to continue";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const currentPlan = PLANS.find(p => p.key === selectedPlan)!;
  const requiresTransfer = currentPlan.requiresBankTransfer;

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

              {pendingPurchase && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                  ⏳ Your <b>{pendingPurchase.plan_key === "6month" ? "6-Month" : "Lifetime"}</b> bank
                  transfer of <b>₦{pendingPurchase.amount.toLocaleString()}</b> is awaiting admin approval.
                </div>
              )}

              <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-left">
                <div className="flex items-center gap-2 text-xs"><Zap className="w-3.5 h-3.5 text-amber-500" /> Real-time AI signals</div>
                <div className="flex items-center gap-2 text-xs"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Smart entry/exit points</div>
                <div className="flex items-center gap-2 text-xs"><Bot className="w-3.5 h-3.5 text-primary" /> One-tap trade execution</div>
              </div>

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
                          isSelected ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:border-primary/50"
                        }`}
                      >
                        <div className="flex justify-center mb-1 text-primary">{plan.icon}</div>
                        <p className="text-xs font-bold">{plan.label}</p>
                        <p className="text-[10px] text-muted-foreground">{plan.duration}</p>
                        <p className="text-sm font-bold mt-1">₦{price.toLocaleString()}</p>
                        {plan.requiresBankTransfer && (
                          <p className="text-[9px] text-amber-500 font-semibold mt-0.5">Bank only</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!requiresTransfer ? (
                <>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      Wallet balance: ₦{wallet?.balance?.toLocaleString() || 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Daily bot auto-expires after 24 hours — renew anytime from your wallet.
                    </p>
                  </div>
                  <Button
                    className="w-full gradient-primary font-bold h-12"
                    onClick={purchaseDaily}
                    disabled={purchaseLoading !== null}
                  >
                    {purchaseLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                    Activate Daily — ₦{getPrice(currentPlan).toLocaleString()}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <p className="text-xs font-semibold flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Bank transfer required ({currentPlan.label})
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Long-term plans cannot be paid with wallet balance. Transfer{" "}
                      <b>₦{getPrice(currentPlan).toLocaleString()}</b> to any account below, then upload
                      your payment screenshot. Admin will approve within minutes.
                    </p>
                    {methods.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No bank accounts configured. Contact admin.</p>
                    ) : (
                      methods.map(m => (
                        <div key={m.id} className="rounded-lg bg-background p-2 text-xs space-y-1">
                          <p className="font-semibold">{m.name}</p>
                          <div className="flex items-start justify-between gap-2">
                            <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed flex-1">{m.details}</pre>
                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => copy(m.details)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Payment screenshot
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                    />
                  </div>

                  <Button
                    className="w-full gradient-primary font-bold h-12"
                    onClick={submitBankTransfer}
                    disabled={purchaseLoading !== null || !screenshot}
                  >
                    {purchaseLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Submit Payment — ₦{getPrice(currentPlan).toLocaleString()}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                    <Zap className="w-3 h-3 mr-1" /> Bot Active
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{formatExpiry()}</span>
                </div>
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
                    <Badge variant="outline" className="text-xs">{signal.confidence}% confidence</Badge>
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

                  <Button size="sm" className="w-full h-9" onClick={() => executeSignal(signal)}>
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
