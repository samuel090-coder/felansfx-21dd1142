import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, RefreshCw, BarChart3, ListOrdered, History, Bot } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePriceSimulation, useMultiSymbolPrices } from "@/hooks/usePriceSimulation";
import { useDemoTrading } from "@/hooks/useDemoTrading";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TradingChart } from "@/components/trading/TradingChart";
import { SymbolSelector } from "@/components/trading/SymbolSelector";
import { TradingControls } from "@/components/trading/TradingControls";
import { OpenPositions } from "@/components/trading/OpenPositions";
import { TradeHistory } from "@/components/trading/TradeHistory";
import { AccountStats } from "@/components/trading/AccountStats";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

const ALL_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
  "EURGBP", "EURJPY", "GBPJPY",
  "BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD", "ADAUSD", "DOGEUSD", "DOTUSD", "LTCUSD", "LINKUSD",
  "XAUUSD", "XAGUSD", "XTIUSD", "XBRUSD",
];

const Trading = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSD");
  const [activeTab, setActiveTab] = useState("chart");

  const { currentPrice, candles, getFormattedPrice } = usePriceSimulation(selectedSymbol, 1000);
  const allPrices = useMultiSymbolPrices(ALL_SYMBOLS);
  
  const {
    wallet,
    positions,
    history,
    loading: tradingLoading,
    openPosition,
    closePosition,
    resetAccount,
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

  const handleTrade = async (
    type: "buy" | "sell",
    amount: number,
    leverage: number,
    stopLoss?: number,
    takeProfit?: number
  ) => {
    await openPosition(selectedSymbol, type, amount, currentPrice, leverage, stopLoss, takeProfit);
  };

  const handleClosePosition = async (positionId: string, exitPrice: number) => {
    await closePosition(positionId, exitPrice);
  };

  const priceChange = allPrices[selectedSymbol]?.changePercent || 0;
  const isUp = priceChange >= 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <SymbolSelector
            selectedSymbol={selectedSymbol}
            onSymbolChange={setSelectedSymbol}
            prices={allPrices}
          />

          <Button variant="ghost" size="icon" onClick={resetAccount}>
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>

        {/* Price Display */}
        <div className="flex items-center justify-center pb-2 gap-3">
          <span className={cn(
            "text-3xl font-bold tabular-nums",
            isUp ? "text-green-500" : "text-red-500"
          )}>
            {getFormattedPrice(currentPrice)}
          </span>
          <Badge variant={isUp ? "default" : "destructive"} className={cn(
            "font-medium",
            isUp ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : "bg-red-500/20 text-red-500 hover:bg-red-500/30"
          )}>
            {isUp ? "+" : ""}{priceChange.toFixed(2)}%
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-4 mx-4 mt-2">
            <TabsTrigger value="chart" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Chart</span>
            </TabsTrigger>
            <TabsTrigger value="trade" className="gap-1.5">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Trade</span>
            </TabsTrigger>
            <TabsTrigger value="positions" className="gap-1.5 relative">
              <ListOrdered className="w-4 h-4" />
              <span className="hidden sm:inline">Positions</span>
              {positions.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {positions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="flex-1 m-0 p-2">
            <div className="h-[calc(100vh-280px)] bg-card rounded-lg border overflow-hidden">
              <TradingChart
                candles={candles}
                currentPrice={currentPrice}
                symbol={selectedSymbol}
              />
            </div>
            
            {/* Quick Stats */}
            <div className="mt-3">
              <AccountStats
                balance={wallet?.balance || 0}
                totalPnl={wallet?.total_pnl || 0}
                totalTrades={wallet?.total_trades || 0}
                winningTrades={wallet?.winning_trades || 0}
              />
            </div>
          </TabsContent>

          <TabsContent value="trade" className="flex-1 m-0 p-4">
            <div className="h-32 mb-4 bg-card rounded-lg border overflow-hidden">
              <TradingChart
                candles={candles}
                currentPrice={currentPrice}
                symbol={selectedSymbol}
                className="h-full"
              />
            </div>
            <TradingControls
              symbol={selectedSymbol}
              currentPrice={currentPrice}
              balance={wallet?.balance || 0}
              onTrade={handleTrade}
              disabled={!wallet}
            />
          </TabsContent>

          <TabsContent value="positions" className="flex-1 m-0 p-4">
            <OpenPositions
              positions={positions}
              onClose={handleClosePosition}
              prices={allPrices}
            />
          </TabsContent>

          <TabsContent value="history" className="flex-1 m-0 p-4">
            <TradeHistory trades={history} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Demo Badge */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
          Demo Account - Virtual Trading
        </Badge>
      </div>
    </div>
  );
};

export default Trading;
