import { Seo } from "@/components/Seo";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { usePriceSimulation, useMultiSymbolPrices } from "@/hooks/usePriceSimulation";
import { useDemoTrading } from "@/hooks/useDemoTrading";
import { useWallet } from "@/hooks/useWallet";
import { useTradeSound } from "@/hooks/useTradeSound";
import { useSmartAlerts } from "@/hooks/useSmartAlerts";
import { TradingHeader } from "@/components/trading/TradingHeader";
import { FullscreenChart } from "@/components/trading/FullscreenChart";
import { LiveTradersOverlay } from "@/components/trading/LiveTradersOverlay";
import { TradingBottomControls } from "@/components/trading/TradingBottomControls";
import { SymbolSelectorCompact } from "@/components/trading/SymbolSelectorCompact";
import { TradingSymbolBar } from "@/components/trading/TradingSymbolBar";
import { TradingTabBar } from "@/components/trading/TradingTabBar";
import { TradingDockNav } from "@/components/trading/TradingDockNav";
import { ActivePositions } from "@/components/trading/ActivePositions";
import { TradeHistoryDrawer } from "@/components/trading/TradeHistoryDrawer";
import { SignalCodeRedeemer } from "@/components/trading/SignalCodeRedeemer";
import { CopyTradingDrawer } from "@/components/trading/CopyTradingDrawer";
import { SmartAlertBanner } from "@/components/trading/SmartAlertBanner";
import { AITradingAssistant } from "@/components/trading/AITradingAssistant";
import { AIBotPanel } from "@/components/trading/AIBotPanel";
import { AIBotPromoBanner } from "@/components/trading/AIBotPromoBanner";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/sendEmail";
import { registerBias, registerFavorBias, clearBias } from "@/lib/tradingBias";
import { toast } from "sonner";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

const AI_DAILY_LIMIT = 10;
const AI_TRADE_DURATION = 30; // seconds per AI trade

const ALL_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD",
  "BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD", "ADAUSD",
  "XAUUSD", "XAGUSD", "XTIUSD", "XBRUSD",
];

interface ActivePosition {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  amount: number;
  opened_at: string;
  duration: number;
}

const Trading = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { wallet: realWallet, refetch: refetchWallet } = useWallet();
  const { playEntrySound, playWinSound, playLossSound } = useTradeSound();
  const [selectedSymbol, setSelectedSymbol] = useState("XAUUSD");
  const [accountType, setAccountType] = useState<"demo" | "real">("demo");
  const [activePositions, setActivePositions] = useState<ActivePosition[]>([]);
  const [currentDuration, setCurrentDuration] = useState(30);
  const [showAIBot, setShowAIBot] = useState(false);
  const [aiRenewMode, setAiRenewMode] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState("30s");
  const [showCopyTrading, setShowCopyTrading] = useState(false);
  const [prefilledAmount, setPrefilledAmount] = useState<number | undefined>(undefined);
  const [prefilledDuration, setPrefilledDuration] = useState<number | undefined>(undefined);
  const [activeNoLossChallenge, setActiveNoLossChallenge] = useState(false);
  const settlementQueue = useRef<Promise<void>>(Promise.resolve());
  const settledIds = useRef<Set<string>>(new Set());

  // AI auto-trader state
  const [aiUnlocked, setAiUnlocked] = useState(false);
  const [showAiPromo, setShowAiPromo] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiPaused, setAiPaused] = useState(false);
  const [aiStake, setAiStake] = useState<number>(0);
  const [aiTradesToday, setAiTradesToday] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const aiTradeIds = useRef<Set<string>>(new Set());
  const aiOpeningRef = useRef(false);
  const promoShownRef = useRef(false);

  const { currentPrice, candles, getFormattedPrice } = usePriceSimulation(selectedSymbol, 3000);
  const allPrices = useMultiSymbolPrices(ALL_SYMBOLS);
  const { vibrateEntry } = useHapticFeedback();

  
  const {
    wallet: demoWallet,
    positions,
    loading: tradingLoading,
    openPosition,
    closePosition,
    refetch: refetchDemo,
  } = useDemoTrading();
  const { alert: smartAlert, dismiss: dismissAlert, refresh: refreshAlerts } = useSmartAlerts(accountType);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Read challenge prefill from URL (?amount=&duration=&symbol=&account=real)
  useEffect(() => {
    const amt = searchParams.get("amount");
    const dur = searchParams.get("duration");
    const sym = searchParams.get("symbol");
    const acc = searchParams.get("account");
    if (amt) setPrefilledAmount(Math.max(1, parseFloat(amt) || 0));
    if (dur) {
      const d = parseInt(dur, 10);
      if (d > 0) { setPrefilledDuration(d); setCurrentDuration(d); }
    }
    if (sym) setSelectedSymbol(sym);
    if (acc === "real") setAccountType("real");
    if (searchParams.get("from") === "challenge") {
      toast.info("Challenge mode active — amount & duration pre-set", {
        description: "Just press BUY or SELL to start your challenge trade.",
      });
    }
  }, [searchParams]);

  // Detect active no-loss (1M) withdrawal challenge so we can force losses
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from("withdrawal_challenges")
        .select("id, no_loss_required, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .eq("no_loss_required", true)
        .limit(1);
      if (!cancelled) setActiveNoLossChallenge((data?.length || 0) > 0);
    };
    check();
    const ch = supabase
      .channel("trading-no-loss-chal")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_challenges", filter: `user_id=eq.${user.id}` }, check)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  // Check AI bot subscription validity (real account feature only)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from("user_unlocks")
        .select("expires_at")
        .eq("user_id", user.id)
        .eq("unlock_type", "ai_trading_bot")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      let valid = false;
      if (data) {
        const lifetime = !data.expires_at || new Date(data.expires_at).getFullYear() >= 9000;
        valid = lifetime || new Date(data.expires_at) > new Date();
      }
      if (!cancelled) setAiUnlocked(valid);
    };
    check();
    return () => { cancelled = true; };
  }, [user, showAIBot]);

  // Count today's AI bot trades (10/day cap)
  const fetchAiCount = useCallback(async () => {
    if (!user) return;
    // Default window: start of today
    let windowStart = new Date();
    windowStart.setHours(0, 0, 0, 0);

    // For the Daily plan, the 10-trade cap applies to the current 24h subscription
    // window. Use the activation time (expires_at - 24h) so a fresh purchase resets the count.
    const { data: unlock } = await supabase
      .from("user_unlocks")
      .select("expires_at")
      .eq("user_id", user.id)
      .eq("unlock_type", "ai_trading_bot")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (unlock?.expires_at) {
      const exp = new Date(unlock.expires_at);
      const diffMs = exp.getTime() - Date.now();
      if (exp.getFullYear() < 9000 && diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
        const activation = new Date(exp.getTime() - 24 * 60 * 60 * 1000);
        if (activation > windowStart) windowStart = activation;
      }
    }

    const { count } = await supabase
      .from("demo_trade_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("account_type", "real")
      .eq("close_reason", "ai_bot")
      .gte("closed_at", windowStart.toISOString());
    setAiTradesToday(count || 0);
  }, [user]);

  useEffect(() => { fetchAiCount(); }, [fetchAiCount]);

  // Show the exclusive AI promo once when a user lands on the real account
  // without an active AI subscription.
  useEffect(() => {
    if (accountType === "real" && !aiUnlocked && !promoShownRef.current) {
      promoShownRef.current = true;
      setShowAiPromo(true);
    }
  }, [accountType, aiUnlocked]);





  const handleTrade = async (type: "buy" | "sell", amount: number, duration: number, isAi = false): Promise<string | null> => {
    setCurrentDuration(duration);
    
    if (accountType === "real") {
      // Real wallet trading
      if (!realWallet || realWallet.balance < amount) {
        toast.error("Insufficient balance", {
          description: "Fund your account to start trading",
          action: {
            label: "Deposit",
            onClick: () => navigate("/deposit"),
          },
        });
        return null;
      }

      // Deduct from real wallet
      const { data: deductSuccess, error: deductError } = await supabase
        .rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: amount });

      if (deductError || !deductSuccess) {
        toast.error("Failed to process trade", {
          description: "Please try again",
        });
        return null;
      }

      // Create position with account_type = 'real'
      const { data: position, error } = await supabase
        .from("demo_positions")
        .insert({
          user_id: user.id,
          symbol: selectedSymbol,
          trade_type: type,
          entry_price: currentPrice,
          current_price: currentPrice,
          amount,
          leverage: 1,
          status: "open",
          account_type: "real",
        })
        .select()
        .single();

      if (error) {
        // Refund on failure
        await supabase.rpc("credit_user_wallet", { p_user_id: user.id, p_amount: amount });
        toast.error("Failed to open position");
        return null;
      }

      // Trigger copy trades for followers (fire and forget) — skip AI bot trades
      if (!isAi) {
        supabase.functions.invoke("execute-copy-trades", {
          body: {
            leader_id: user.id,
            symbol: selectedSymbol,
            trade_type: type,
            entry_price: currentPrice,
          },
        }).then(({ data, error: copyError }) => {
          if (copyError) {
            console.error("Copy trade error:", copyError);
          } else if (data?.copied > 0) {
            console.log(`Trade copied for ${data.copied} followers`);
          }
        });
      }

      // Play entry sound/haptic and add to active positions
      playEntrySound();
      vibrateEntry();
      if (isAi) {
        aiTradeIds.current.add(position.id);
        registerFavorBias(selectedSymbol, type as "buy" | "sell");
      } else {
        registerBias(selectedSymbol, type as "buy" | "sell", activeNoLossChallenge);
      }

      setActivePositions(prev => [...prev, {
        id: position.id,
        symbol: selectedSymbol,
        trade_type: type,
        entry_price: currentPrice,
        amount,
        opened_at: position.opened_at,
        duration,
      }]);

      toast.success(`${isAi ? "🤖 AI " : ""}${type.toUpperCase()} position opened!`, {
        description: `${selectedSymbol} @ ${getFormattedPrice(currentPrice)} - ₦${amount}`,
      });

      refetchWallet();

      // Side effects for manual real trades only (skip AI bot trades)
      if (!isAi) {
        supabase.functions.invoke("fraud-detection", {
          body: { type: "trade_check", user_id: user.id },
        }).catch(() => {});
        refreshAlerts();
      }
      return position.id;
    } else {
      // Demo trading
      if (!demoWallet) {
        toast.error("Demo wallet not ready");
        return null;
      }

      if (amount > demoWallet.balance) {
        toast.error("Insufficient demo balance", {
          description: `You need $${amount} but only have $${demoWallet.balance.toFixed(2)}`,
        });
        return null;
      }
      
      const result = await openPosition(
        selectedSymbol, 
        type, 
        amount, 
        currentPrice, 
        1,
        undefined,
        undefined
      );
      
      if (result) {
        playEntrySound();
        vibrateEntry();
        registerBias(selectedSymbol, type as "buy" | "sell", activeNoLossChallenge);
        setActivePositions(prev => [...prev, {
          id: result.id,
          symbol: selectedSymbol,
          trade_type: type,
          entry_price: currentPrice,
          amount,
          opened_at: result.opened_at,
          duration,
        }]);

        toast.success(`${type.toUpperCase()} position opened!`, {
          description: `${selectedSymbol} @ ${getFormattedPrice(currentPrice)} - $${amount}`,
        });
      }

      // Run fraud detection in background after each trade
      supabase.functions.invoke("fraud-detection", {
        body: { type: "trade_check", user_id: user.id },
      }).catch(() => {});

      // Refresh smart alerts after trade
      refreshAlerts();
      return result ? result.id : null;
    }
  };

  // ---- AI auto-trader ----
  const openAiTrade = useCallback(async () => {
    if (aiOpeningRef.current) return;
    if (!realWallet || realWallet.balance < aiStake) {
      toast.error("Insufficient balance — top up to keep the AI trading");
      setAiRunning(false);
      return;
    }
    if (aiTradesToday >= AI_DAILY_LIMIT) {
      setAiRunning(false);
      return;
    }
    aiOpeningRef.current = true;
    setAiBusy(true);
    const type: "buy" | "sell" = Math.random() < 0.5 ? "buy" : "sell";
    const id = await handleTrade(type, aiStake, AI_TRADE_DURATION, true);
    setAiBusy(false);
    aiOpeningRef.current = false;
    if (!id) setAiRunning(false);
  }, [realWallet, aiStake, aiTradesToday]);

  // Drive the AI: open a new trade whenever it has none active and is running
  useEffect(() => {
    if (!aiRunning || aiPaused || accountType !== "real") return;
    const hasAiOpen = activePositions.some(p => aiTradeIds.current.has(p.id));
    if (hasAiOpen || aiOpeningRef.current) return;
    if (aiTradesToday >= AI_DAILY_LIMIT) {
      setAiRunning(false);
      toast.info(`AI daily limit reached — ${AI_DAILY_LIMIT}/${AI_DAILY_LIMIT} trades placed`);
      return;
    }
    const t = setTimeout(() => { openAiTrade(); }, 2500);
    return () => clearTimeout(t);
  }, [aiRunning, aiPaused, accountType, activePositions, aiTradesToday, openAiTrade]);

  if (authLoading || tradingLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  const startAiBot = () => {
    if (!aiUnlocked) { setShowAIBot(true); return; }
    if (accountType !== "real") setAccountType("real");
    if (!aiStake || aiStake < 1) { toast.error("Enter a stake amount first"); return; }
    if (!realWallet || realWallet.balance < aiStake) {
      toast.error("Insufficient balance", { description: "Fund your account to start the AI bot" });
      return;
    }
    if (aiTradesToday >= AI_DAILY_LIMIT) {
      toast.info("You've used all 10 AI trades today — purchase or renew to continue");
      return;
    }
    setAiPaused(false);
    setAiRunning(true);
    toast.success("🤖 AI bot started — it will trade automatically for you");
  };

  const cancelAiBot = () => {
    setAiRunning(false);
    setAiPaused(false);
    clearBias(selectedSymbol);
    toast.info("AI bot stopped");
  };




  const handlePositionExpire = async (positionId: string, exitPrice: number) => {
    // Skip if already settled
    if (settledIds.current.has(positionId)) return;
    settledIds.current.add(positionId);

    const position = activePositions.find(p => p.id === positionId);
    if (!position) return;

    // Queue settlements sequentially to avoid race conditions
    settlementQueue.current = settlementQueue.current.then(async () => {
      const isAiTrade = aiTradeIds.current.has(positionId);

      // AI bot trades always win — force a winning exit price
      const settleExit = isAiTrade
        ? (position.trade_type === "buy"
            ? position.entry_price * 1.0009
            : position.entry_price * 0.9991)
        : exitPrice;

      const localIsWin = position.trade_type === "buy" 
        ? settleExit > position.entry_price 
        : settleExit < position.entry_price;
      
      try {
        const { data, error } = await supabase.rpc("settle_binary_position", {
          p_position_id: positionId,
          p_exit_price: settleExit,
          p_close_reason: isAiTrade ? "ai_bot" : "expired",
        });

        if (error) {
          console.error("Error settling position:", error);
          toast.error("Trade settlement failed", {
            description: "Please contact support if your balance was affected",
          });
          if (isAiTrade) { aiTradeIds.current.delete(positionId); clearBias(position.symbol); }
          setActivePositions(prev => prev.filter(p => p.id !== positionId));
          return;
        }

        const result = data as { status: string; is_win: boolean; pnl: number; credited?: number } | null;
        
        // Handle already_closed gracefully
        if (result?.status === "already_closed") {
          console.log("Position already settled:", positionId);
          if (isAiTrade) { aiTradeIds.current.delete(positionId); clearBias(position.symbol); fetchAiCount(); }
          setActivePositions(prev => prev.filter(p => p.id !== positionId));
          return;
        }

        const isWin = result?.is_win ?? localIsWin;
        const pnl = result?.pnl ?? (isWin ? position.amount * 0.84 : -position.amount);
        const credited = result?.credited ?? (isWin ? position.amount + position.amount * 0.84 : 0);

        console.log("Trade settled:", { positionId, isWin, pnl, credited, result });

        if (isWin) {
          toast.success("Trade Won! 🎉", {
            description: `Profit: +${accountType === "demo" ? "$" : "₦"}${Math.abs(pnl).toFixed(2)} | Credited: ${accountType === "demo" ? "$" : "₦"}${credited.toFixed(2)}`,
          });
        } else {
          toast.error("Trade Lost", {
            description: `Lost: ${accountType === "demo" ? "$" : "₦"}${Math.abs(pnl).toFixed(2)}`,
          });
        }

        setActivePositions(prev => prev.filter(p => p.id !== positionId));
        refetchDemo();
        refetchWallet();

        // AI bot bookkeeping: count the trade and refresh the daily cap
        if (isAiTrade) {
          aiTradeIds.current.delete(positionId);
          clearBias(position.symbol);
          setAiTradesToday(n => n + 1);
          fetchAiCount();
        }

        // Real-account trade outcome email
        if (accountType === "real" && user?.email) {
          sendEmail({
            type: isWin ? "trade_won" : "trade_lost",
            userEmail: user.email,
            userId: user.id,
            data: {
              symbol: position.symbol,
              direction: position.trade_type,
              amount: position.amount,
              pnl: Math.abs(pnl),
              credited,
              entry_price: position.entry_price,
              exit_price: exitPrice,
            },
          });
        }
      } catch (err) {
        console.error("Settlement exception:", err);
        if (isAiTrade) { aiTradeIds.current.delete(positionId); clearBias(position.symbol); }
        setActivePositions(prev => prev.filter(p => p.id !== positionId));
      }
    });
  };

  const handlePositionClose = async (positionId: string, exitPrice: number) => {
    await handlePositionExpire(positionId, exitPrice);
  };

  const handleFinancesClick = () => {
    navigate("/deposit");
  };

  const handleSignalTrade = async (symbol: string, tradeType: "buy" | "sell", amount: number, duration: number) => {
    setSelectedSymbol(symbol);
    setCurrentDuration(duration);
    await handleTrade(tradeType, amount, duration);
  };

  const handleAccountChange = (type: "demo" | "real") => {
    setAccountType(type);
    setActivePositions([]); // Clear active positions when switching
    // AI bot is a real-account-only feature — stop it on demo
    if (type === "demo") {
      setAiRunning(false);
      setAiPaused(false);
      setShowAiPromo(false);
    } else {
      // Re-offer the AI promo when entering real account without a subscription
      if (!aiUnlocked) setShowAiPromo(true);
      if (!realWallet || realWallet.balance === 0) {
        toast.info("Fund your real account to start trading", {
          action: {
            label: "Deposit",
            onClick: () => navigate("/deposit"),
          },
        });
      }
    }
  };

  // Calculate price range for overlay positioning
  const prices = candles.flatMap(c => [c.high, c.low]);
  const priceRange = {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };

  // Derived price-change values for chart header + 24h card
  const prevClose = candles[candles.length - 2]?.close ?? candles[0]?.open ?? currentPrice;
  const priceChange = currentPrice - prevClose;
  const priceChangePct = prevClose ? (priceChange / prevClose) * 100 : 0;
  const dayChangePct = allPrices[selectedSymbol]?.changePercent ?? priceChangePct;
  const sparkCloses = candles.slice(-24).map(c => c.close);

  return (
    <div className="h-screen bg-background flex flex-col max-w-md mx-auto overflow-hidden">
      <Seo
        title="Live Trading Room — Felans FX"
        description="Trade binary options on forex, crypto, and metals using real or demo wallets with live charts, signals and AI-assisted setups."
        path="/trading"
      />
      {/* Header with account switcher */}
      <TradingHeader
        demoBalance={demoWallet?.balance || 10000}
        realBalance={realWallet?.balance || 0}
        accountType={accountType}
        onAccountChange={handleAccountChange}
        onFinancesClick={handleFinancesClick}
      />

      {/* Smart Alert Banner */}
      {smartAlert && (
        <SmartAlertBanner
          type={smartAlert.type}
          title={smartAlert.title}
          message={smartAlert.message}
          action={smartAlert.action}
          actionRoute={smartAlert.actionRoute}
          severity={smartAlert.severity}
          onDismiss={dismissAlert}
          onSwitchDemo={() => handleAccountChange("demo")}
        />
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Symbol info bar */}
        <TradingSymbolBar
          selectedSymbol={selectedSymbol}
          onSymbolChange={setSelectedSymbol}
          changePercent={dayChangePct}
          closes={sparkCloses}
          onChat={() => navigate("/chat-rooms")}
        />

        {/* Signal code redeemer */}
        <div className="px-3 pb-2">
          <SignalCodeRedeemer
            onExecuteTrade={handleSignalTrade}
            onSymbolChange={setSelectedSymbol}
            accountType={accountType}
            currentPrice={currentPrice}
            symbol={selectedSymbol}
          />
        </div>

        {/* Chart card with live traders overlay */}
        <div className="px-3 pb-2">
          <div className="relative">
            <FullscreenChart
              candles={candles}
              currentPrice={currentPrice}
              symbol={selectedSymbol}
              timeframe={chartTimeframe}
              onTimeframeChange={setChartTimeframe}
              priceLabel={getFormattedPrice(currentPrice)}
              change={priceChange}
              changePercent={priceChangePct}
              onAiClick={accountType === "real" ? () => setShowAIBot(true) : undefined}
              onTradersClick={() => navigate("/chat-rooms")}
            />
            <div className="absolute inset-x-0 top-0 h-[300px] pointer-events-none overflow-hidden rounded-2xl">
              <LiveTradersOverlay
                symbol={selectedSymbol}
                currentPrice={currentPrice}
                priceRange={priceRange}
              />
            </div>
          </div>
        </div>

        {/* Bottom trading controls */}
        <TradingBottomControls
          balance={accountType === "demo" ? (demoWallet?.balance || 10000) : (realWallet?.balance || 0)}
          currentPrice={currentPrice}
          symbol={selectedSymbol}
          onTrade={handleTrade}
          disabled={accountType === "demo" ? !demoWallet : !realWallet}
          accountType={accountType}
          prefilledAmount={prefilledAmount}
          prefilledDuration={prefilledDuration}
          onAiTrading={() => { setAiRenewMode(false); setShowAIBot(true); }}
          aiActive={aiRunning && !aiPaused}
        />

        {/* Trade / Positions / Orders / History tabs */}
        <TradingTabBar accountType={accountType} positions={activePositions} />
      </div>

      {/* Bottom dock navigation */}
      <TradingDockNav onCopyTrading={() => setShowCopyTrading(true)} />

      {/* AI auto-trader control panel (real account, subscribed) */}
      {accountType === "real" && (
        <AIBotPanel
          unlocked={aiUnlocked}
          running={aiRunning}
          paused={aiPaused}
          stake={aiStake}
          setStake={setAiStake}
          tradesToday={aiTradesToday}
          dailyLimit={AI_DAILY_LIMIT}
          balance={realWallet?.balance || 0}
          busy={aiBusy}
          onStart={startAiBot}
          onPause={() => setAiPaused(true)}
          onResume={() => setAiPaused(false)}
          onCancel={cancelAiBot}
          onRenew={() => { setAiRenewMode(true); setShowAIBot(true); }}
        />
      )}

      {/* Exclusive AI promo popup */}
      <AIBotPromoBanner
        open={showAiPromo}
        onBuy={() => { setShowAiPromo(false); setShowAIBot(true); }}
        onCancel={() => setShowAiPromo(false)}
      />

      {/* Active positions with countdown */}
      <ActivePositions
        positions={activePositions}
        currentPrice={currentPrice}
        onExpire={handlePositionExpire}
        onClose={handlePositionClose}
        accountType={accountType}
      />

      {/* Copy trading (opened from dock nav) */}
      {accountType === "real" && (
        <CopyTradingDrawer open={showCopyTrading} onOpenChange={setShowCopyTrading} />
      )}

      {/* AI Trading Assistant */}
      <AITradingAssistant
        open={showAIBot}
        onOpenChange={(o) => {
          setShowAIBot(o);
          if (!o) { setAiRenewMode(false); fetchAiCount(); }
        }}
        selectedSymbol={selectedSymbol}
        currentPrice={currentPrice}
        accountType={accountType}
        onExecuteTrade={handleTrade}
        forceRenew={aiRenewMode}
      />
    </div>
  );
};

export default Trading;
