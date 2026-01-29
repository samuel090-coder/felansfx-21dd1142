import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePriceSimulation, useMultiSymbolPrices } from "@/hooks/usePriceSimulation";
import { useDemoTrading } from "@/hooks/useDemoTrading";
import { useWallet } from "@/hooks/useWallet";
import { useTradeSound } from "@/hooks/useTradeSound";
import { TradingHeader } from "@/components/trading/TradingHeader";
import { FullscreenChart } from "@/components/trading/FullscreenChart";
import { LiveTradersOverlay } from "@/components/trading/LiveTradersOverlay";
import { TradingBottomControls } from "@/components/trading/TradingBottomControls";
import { SymbolSelectorCompact } from "@/components/trading/SymbolSelectorCompact";
import { ActivePositions } from "@/components/trading/ActivePositions";
import { TradeHistoryDrawer } from "@/components/trading/TradeHistoryDrawer";
import { CopyTradingDrawer } from "@/components/trading/CopyTradingDrawer";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
  const { user, loading: authLoading } = useAuth();
  const { wallet: realWallet, refetch: refetchWallet } = useWallet();
  const { playEntrySound, playWinSound, playLossSound } = useTradeSound();
  const [selectedSymbol, setSelectedSymbol] = useState("XAUUSD");
  const [accountType, setAccountType] = useState<"demo" | "real">("demo");
  const [activePositions, setActivePositions] = useState<ActivePosition[]>([]);
  const [currentDuration, setCurrentDuration] = useState(30);

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || tradingLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  const handleTrade = async (type: "buy" | "sell", amount: number, duration: number) => {
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
        return;
      }

      // Deduct from real wallet
      const { data: deductSuccess, error: deductError } = await supabase
        .rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: amount });

      if (deductError || !deductSuccess) {
        toast.error("Failed to process trade", {
          description: "Please try again",
        });
        return;
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
        return;
      }

      // Play entry sound/haptic and add to active positions
      playEntrySound();
      vibrateEntry();
      setActivePositions(prev => [...prev, {
        id: position.id,
        symbol: selectedSymbol,
        trade_type: type,
        entry_price: currentPrice,
        amount,
        opened_at: position.opened_at,
        duration,
      }]);

      toast.success(`${type.toUpperCase()} position opened!`, {
        description: `${selectedSymbol} @ ${getFormattedPrice(currentPrice)} - ₦${amount}`,
      });

      refetchWallet();
    } else {
      // Demo trading
      if (!demoWallet) {
        toast.error("Demo wallet not ready");
        return;
      }

      if (amount > demoWallet.balance) {
        toast.error("Insufficient demo balance", {
          description: `You need $${amount} but only have $${demoWallet.balance.toFixed(2)}`,
        });
        return;
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
    }
  };

  const handlePositionExpire = async (positionId: string, exitPrice: number) => {
    const position = activePositions.find(p => p.id === positionId);
    if (!position) return;

    // Use the atomic settle RPC – handles demo + real wallet credits in one call
    const { data, error } = await supabase.rpc("settle_binary_position", {
      p_position_id: positionId,
      p_exit_price: exitPrice,
      p_close_reason: "expired",
    });

    if (error) {
      console.error("Error settling position:", error);
    }

    const result = data as { status: string; is_win: boolean; pnl: number } | null;
    const isWin = result?.is_win ?? false;
    const pnl = result?.pnl ?? 0;

    // Play sound and show toast
    if (isWin) {
      playWinSound();
      toast.success("Trade Won! 🎉", {
        description: `+${accountType === "demo" ? "$" : "₦"}${pnl.toFixed(2)}`,
      });
    } else {
      playLossSound();
      toast.error("Trade Lost", {
        description: `${accountType === "demo" ? "$" : "₦"}${pnl.toFixed(2)}`,
      });
    }

    // Remove from active positions
    setActivePositions(prev => prev.filter(p => p.id !== positionId));
    refetchDemo();
    refetchWallet();
  };

  const handlePositionClose = async (positionId: string, exitPrice: number) => {
    await handlePositionExpire(positionId, exitPrice);
  };

  const handleFinancesClick = () => {
    navigate("/deposit");
  };

  const handleAccountChange = (type: "demo" | "real") => {
    setAccountType(type);
    setActivePositions([]); // Clear active positions when switching
    if (type === "real" && (!realWallet || realWallet.balance === 0)) {
      toast.info("Fund your real account to start trading", {
        action: {
          label: "Deposit",
          onClick: () => navigate("/deposit"),
        },
      });
    }
  };

  // Calculate price range for overlay positioning
  const prices = candles.flatMap(c => [c.high, c.low]);
  const priceRange = {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };

  return (
    <div className="min-h-screen bg-[hsl(222,47%,8%)] flex flex-col">
      {/* Header with account switcher */}
      <TradingHeader
        demoBalance={demoWallet?.balance || 10000}
        realBalance={realWallet?.balance || 0}
        accountType={accountType}
        onAccountChange={handleAccountChange}
        onFinancesClick={handleFinancesClick}
      />

      {/* Symbol selector row */}
      <SymbolSelectorCompact
        selectedSymbol={selectedSymbol}
        onSymbolChange={setSelectedSymbol}
      />

      {/* Current price display */}
      <div className="absolute left-2 top-32 z-10">
        <div className="bg-primary px-3 py-1 rounded text-sm font-bold text-primary-foreground tabular-nums">
          {getFormattedPrice(currentPrice)}
        </div>
      </div>

      {/* Active positions with countdown */}
      <ActivePositions
        positions={activePositions}
        currentPrice={currentPrice}
        onExpire={handlePositionExpire}
        onClose={handlePositionClose}
        accountType={accountType}
      />

      {/* Main chart area with live traders overlay */}
      <div className="flex-1 relative">
        <FullscreenChart
          candles={candles}
          currentPrice={currentPrice}
          symbol={selectedSymbol}
        />
        
        {/* Live traders overlay */}
        <LiveTradersOverlay
          symbol={selectedSymbol}
          currentPrice={currentPrice}
          priceRange={priceRange}
        />

        {/* Trade history drawer */}
        <TradeHistoryDrawer accountType={accountType} />

        {/* Copy trading drawer */}
        {accountType === "real" && <CopyTradingDrawer />}
      </div>

      {/* Bottom trading controls */}
      <TradingBottomControls
        balance={accountType === "demo" ? (demoWallet?.balance || 10000) : (realWallet?.balance || 0)}
        currentPrice={currentPrice}
        symbol={selectedSymbol}
        onTrade={handleTrade}
        disabled={accountType === "demo" ? !demoWallet : !realWallet}
        accountType={accountType}
      />
    </div>
  );
};

export default Trading;
