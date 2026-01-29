import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePriceSimulation, useMultiSymbolPrices } from "@/hooks/usePriceSimulation";
import { useDemoTrading } from "@/hooks/useDemoTrading";
import { useWallet } from "@/hooks/useWallet";
import { TradingHeader } from "@/components/trading/TradingHeader";
import { FullscreenChart } from "@/components/trading/FullscreenChart";
import { LiveTradersOverlay } from "@/components/trading/LiveTradersOverlay";
import { TradingBottomControls } from "@/components/trading/TradingBottomControls";
import { SymbolSelectorCompact } from "@/components/trading/SymbolSelectorCompact";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

const ALL_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD",
  "BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD", "ADAUSD",
  "XAUUSD", "XAGUSD", "XTIUSD", "XBRUSD",
];

const Trading = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet: realWallet } = useWallet();
  const [selectedSymbol, setSelectedSymbol] = useState("XAUUSD");
  const [accountType, setAccountType] = useState<"demo" | "real">("demo");

  const { currentPrice, candles, getFormattedPrice } = usePriceSimulation(selectedSymbol, 3000);
  const allPrices = useMultiSymbolPrices(ALL_SYMBOLS);
  
  const {
    wallet: demoWallet,
    positions,
    loading: tradingLoading,
    openPosition,
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
    // Block real wallet trading completely
    if (accountType === "real") {
      toast.error("Real trading is not available yet", {
        description: "Please switch to Demo account to practice trading",
        action: {
          label: "Use Demo",
          onClick: () => handleAccountChange("demo"),
        },
      });
      return;
    }
    
    // Ensure user has demo wallet before trading
    if (!demoWallet) {
      toast.error("Demo wallet not ready", {
        description: "Please wait a moment and try again",
      });
      return;
    }

    // Check balance
    if (amount > demoWallet.balance) {
      toast.error("Insufficient demo balance", {
        description: `You need $${amount} but only have $${demoWallet.balance.toFixed(2)}`,
      });
      return;
    }
    
    // For binary options style, we use duration instead of SL/TP
    const result = await openPosition(
      selectedSymbol, 
      type, 
      amount, 
      currentPrice, 
      1, // leverage
      undefined, // stop loss
      undefined  // take profit
    );
    
    if (result) {
      toast.success(`${type.toUpperCase()} position opened!`, {
        description: `${selectedSymbol} @ ${getFormattedPrice(currentPrice)} - $${amount}`,
      });
    }
  };

  const handleFinancesClick = () => {
    navigate("/deposit");
  };

  const handleAccountChange = (type: "demo" | "real") => {
    setAccountType(type);
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
      </div>

      {/* Bottom trading controls */}
      <TradingBottomControls
        balance={accountType === "demo" ? (demoWallet?.balance || 10000) : (realWallet?.balance || 0)}
        currentPrice={currentPrice}
        symbol={selectedSymbol}
        onTrade={handleTrade}
        disabled={!demoWallet && accountType === "demo"}
        accountType={accountType}
      />
    </div>
  );
};

export default Trading;
