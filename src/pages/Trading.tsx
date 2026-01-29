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

  const { currentPrice, candles, getFormattedPrice } = usePriceSimulation(selectedSymbol, 1000);
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
    if (accountType === "real") {
      toast.info("Real trading coming soon! Using demo for now.");
    }
    
    // For binary options style, we use duration instead of SL/TP
    await openPosition(
      selectedSymbol, 
      type, 
      amount, 
      currentPrice, 
      1, // leverage
      undefined, // stop loss
      undefined  // take profit
    );
    
    toast.success(`${type.toUpperCase()} order placed for $${amount}`, {
      description: `${selectedSymbol} @ ${getFormattedPrice(currentPrice)}`,
    });
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
