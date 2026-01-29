import { TrendingUp, TrendingDown, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Position {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  current_price: number;
  amount: number;
  leverage: number;
  pnl: number;
  pnl_percent: number;
  opened_at: string;
}

interface OpenPositionsProps {
  positions: Position[];
  onClose: (positionId: string, exitPrice: number) => void;
  prices: Record<string, { price: number }>;
}

export const OpenPositions = ({ positions, onClose, prices }: OpenPositionsProps) => {
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">No Open Positions</h3>
        <p className="text-sm text-muted-foreground">Start trading to see your positions here</p>
      </div>
    );
  }

  const formatPrice = (symbol: string, price: number) => {
    if (symbol.includes("JPY")) return price.toFixed(3);
    if (["BTCUSD", "ETHUSD", "XAUUSD"].includes(symbol)) return price.toFixed(2);
    if (["XRPUSD", "DOGEUSD", "ADAUSD"].includes(symbol)) return price.toFixed(4);
    return price.toFixed(5);
  };

  return (
    <ScrollArea className="h-[calc(100vh-400px)]">
      <div className="space-y-3 p-1">
        {positions.map(position => {
          const currentPrice = prices[position.symbol]?.price || position.current_price;
          let pnl: number;
          if (position.trade_type === "buy") {
            pnl = (currentPrice - position.entry_price) * position.amount * position.leverage / position.entry_price;
          } else {
            pnl = (position.entry_price - currentPrice) * position.amount * position.leverage / position.entry_price;
          }
          const pnlPercent = (pnl / position.amount) * 100;
          const isProfit = pnl >= 0;

          return (
            <Card key={position.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "font-bold",
                        position.trade_type === "buy" 
                          ? "border-green-500 text-green-500" 
                          : "border-red-500 text-red-500"
                      )}
                    >
                      {position.trade_type === "buy" ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {position.trade_type.toUpperCase()}
                    </Badge>
                    <span className="font-bold">{position.symbol}</span>
                    {position.leverage > 1 && (
                      <Badge variant="secondary" className="text-xs">{position.leverage}x</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => onClose(position.id, currentPrice)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Entry</p>
                    <p className="font-medium">{formatPrice(position.symbol, position.entry_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className={cn("font-medium", isProfit ? "text-green-500" : "text-red-500")}>
                      {formatPrice(position.symbol, currentPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-medium">${position.amount.toFixed(0)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(position.opened_at), { addSuffix: true })}
                  </div>
                  <div className={cn(
                    "text-lg font-bold",
                    isProfit ? "text-green-500" : "text-red-500"
                  )}>
                    {isProfit ? "+" : ""}{pnl.toFixed(2)}
                    <span className="text-xs ml-1">({isProfit ? "+" : ""}{pnlPercent.toFixed(2)}%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
};
