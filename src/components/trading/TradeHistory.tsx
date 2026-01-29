import { TrendingUp, TrendingDown, Clock, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, formatDistanceStrict } from "date-fns";

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price: number;
  amount: number;
  pnl: number;
  pnl_percent: number;
  opened_at: string;
  closed_at: string;
  close_reason: string;
}

interface TradeHistoryProps {
  trades: Trade[];
}

export const TradeHistory = ({ trades }: TradeHistoryProps) => {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">No Trade History</h3>
        <p className="text-sm text-muted-foreground">Completed trades will appear here</p>
      </div>
    );
  }

  const formatPrice = (symbol: string, price: number) => {
    if (symbol.includes("JPY")) return price.toFixed(3);
    if (["BTCUSD", "ETHUSD", "XAUUSD"].includes(symbol)) return price.toFixed(2);
    if (["XRPUSD", "DOGEUSD", "ADAUSD"].includes(symbol)) return price.toFixed(4);
    return price.toFixed(5);
  };

  const formatDuration = (openedAt: string, closedAt: string) => {
    return formatDistanceStrict(new Date(openedAt), new Date(closedAt));
  };

  return (
    <ScrollArea className="h-[calc(100vh-400px)]">
      <div className="space-y-3 p-1">
        {trades.map(trade => {
          const isProfit = trade.pnl >= 0;

          return (
            <Card key={trade.id} className={cn(
              "overflow-hidden border-l-4",
              isProfit ? "border-l-green-500" : "border-l-red-500"
            )}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "font-bold",
                        trade.trade_type === "buy" 
                          ? "border-green-500 text-green-500" 
                          : "border-red-500 text-red-500"
                      )}
                    >
                      {trade.trade_type === "buy" ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {trade.trade_type.toUpperCase()}
                    </Badge>
                    <span className="font-bold">{trade.symbol}</span>
                  </div>
                  <div className={cn(
                    "text-lg font-bold",
                    isProfit ? "text-green-500" : "text-red-500"
                  )}>
                    {isProfit ? "+" : ""}${trade.pnl.toFixed(2)}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Entry</p>
                    <p className="font-medium">{formatPrice(trade.symbol, trade.entry_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Exit</p>
                    <p className="font-medium">{formatPrice(trade.symbol, trade.exit_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-medium">${trade.amount.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Return</p>
                    <p className={cn("font-medium", isProfit ? "text-green-500" : "text-red-500")}>
                      {isProfit ? "+" : ""}{trade.pnl_percent.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(trade.closed_at), "MMM d, HH:mm")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(trade.opened_at, trade.closed_at)}
                  </div>
                  <Badge variant="outline" className="text-[10px]">{trade.close_reason}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
};
