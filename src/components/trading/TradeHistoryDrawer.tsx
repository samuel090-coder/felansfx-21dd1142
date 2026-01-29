import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface TradeHistory {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price: number;
  amount: number;
  pnl: number;
  pnl_percent: number;
  duration_seconds: number | null;
  closed_at: string;
  close_reason: string | null;
}

interface TradeHistoryDrawerProps {
  accountType: "demo" | "real";
}

export const TradeHistoryDrawer = ({ accountType }: TradeHistoryDrawerProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [trades, setTrades] = useState<TradeHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !isOpen) return;

    const fetchTrades = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("demo_trade_history")
        .select("*")
        .eq("user_id", user.id)
        .order("closed_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setTrades(data);
      }
      setLoading(false);
    };

    fetchTrades();

    // Subscribe to new trades
    const channel = supabase
      .channel("trade-history")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "demo_trade_history",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setTrades((prev) => [payload.new as TradeHistory, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isOpen]);

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winCount = trades.filter((t) => t.pnl > 0).length;
  const lossCount = trades.filter((t) => t.pnl < 0).length;

  return (
    <>
      {/* Handle bar to open drawer */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute bottom-[180px] left-1/2 -translate-x-1/2 z-30 bg-card/90 backdrop-blur-sm border border-border rounded-t-lg px-4 py-1.5 flex items-center gap-2"
      >
        <span className="text-xs text-muted-foreground">Trade History</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Drawer */}
      <div
        className={cn(
          "absolute left-0 right-0 bottom-[180px] z-20 bg-card/95 backdrop-blur-md border-t border-border transition-all duration-300 ease-out",
          isOpen ? "h-[45vh] opacity-100" : "h-0 opacity-0 pointer-events-none"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Stats header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Wins</div>
                <div className="text-sm font-bold text-emerald-400">{winCount}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Losses</div>
                <div className="text-sm font-bold text-red-400">{lossCount}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total P&L</div>
              <div
                className={cn(
                  "text-sm font-bold",
                  totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {totalPnl >= 0 ? "+" : ""}
                {accountType === "demo" ? "$" : "₦"}
                {totalPnl.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Trade list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground text-sm">Loading...</div>
              </div>
            ) : trades.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground text-sm">No trades yet</div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {trades.map((trade) => (
                  <div key={trade.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          trade.pnl >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
                        )}
                      >
                        {trade.trade_type === "buy" ? (
                          <TrendingUp
                            className={cn(
                              "w-4 h-4",
                              trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                            )}
                          />
                        ) : (
                          <TrendingDown
                            className={cn(
                              "w-4 h-4",
                              trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                            )}
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded",
                              trade.trade_type === "buy"
                                ? "bg-emerald-500 text-white"
                                : "bg-red-500 text-white"
                            )}
                          >
                            {trade.trade_type.toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {trade.symbol}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(trade.closed_at), "MMM d, HH:mm")} •{" "}
                          {accountType === "demo" ? "$" : "₦"}
                          {trade.amount}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "text-sm font-bold",
                          trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                        )}
                      >
                        {trade.pnl >= 0 ? "+" : ""}
                        {accountType === "demo" ? "$" : "₦"}
                        {trade.pnl.toFixed(2)}
                      </div>
                      <div
                        className={cn(
                          "text-[10px]",
                          trade.pnl >= 0 ? "text-emerald-400/70" : "text-red-400/70"
                        )}
                      >
                        {trade.pnl >= 0 ? "+" : ""}
                        {trade.pnl_percent.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
