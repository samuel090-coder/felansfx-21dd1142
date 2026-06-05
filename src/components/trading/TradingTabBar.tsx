import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, HelpCircle, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { getSymbolMeta } from "@/lib/symbolMeta";

interface ActivePosition {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  amount: number;
  opened_at: string;
  duration: number;
}

interface TradeHistoryRow {
  id: string;
  symbol: string;
  trade_type: string;
  amount: number;
  pnl: number;
  pnl_percent: number;
  closed_at: string;
}

interface TradingTabBarProps {
  accountType: "demo" | "real";
  positions: ActivePosition[];
}

const TABS = ["Trade", "Positions", "Orders", "History"] as const;
type Tab = (typeof TABS)[number];

export const TradingTabBar = ({ accountType, positions }: TradingTabBarProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [active, setActive] = useState<Tab>("Trade");
  const [sheetTab, setSheetTab] = useState<Tab | null>(null);
  const [history, setHistory] = useState<TradeHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const cur = accountType === "demo" ? "$" : "₦";

  useEffect(() => {
    if (sheetTab !== "History" || !user) return;
    setLoading(true);
    supabase
      .from("demo_trade_history")
      .select("id, symbol, trade_type, amount, pnl, pnl_percent, closed_at")
      .eq("user_id", user.id)
      .eq("account_type", accountType)
      .order("closed_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setHistory((data as TradeHistoryRow[]) || []);
        setLoading(false);
      });
  }, [sheetTab, user, accountType]);

  const handleTab = (tab: Tab) => {
    setActive(tab);
    if (tab === "Trade") {
      setSheetTab(null);
    } else {
      setSheetTab(tab);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 px-3 py-2 border-t border-border/40">
        <div className="flex items-center gap-1 flex-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTab(tab)}
              className={cn(
                "relative px-2.5 py-1.5 text-sm font-medium transition-colors",
                active === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {active === tab && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => navigate("/help")}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate("/notification-settings")}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      <Sheet
        open={sheetTab !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSheetTab(null);
            setActive("Trade");
          }
        }}
      >
        <SheetContent side="bottom" className="h-[55vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{sheetTab}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 overflow-y-auto h-[calc(55vh-90px)]">
            {sheetTab === "History" ? (
              loading ? (
                <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
              ) : history.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No trade history yet</p>
              ) : (
                <div className="divide-y divide-border/40">
                  {history.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center",
                            t.pnl >= 0 ? "bg-success/15" : "bg-destructive/15"
                          )}
                        >
                          {t.trade_type === "buy" ? (
                            <TrendingUp className={cn("w-4 h-4", t.pnl >= 0 ? "text-success" : "text-destructive")} />
                          ) : (
                            <TrendingDown className={cn("w-4 h-4", t.pnl >= 0 ? "text-success" : "text-destructive")} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t.symbol}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(t.closed_at), "MMM d, HH:mm")} • {cur}
                            {t.amount}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-sm font-bold tabular-nums", t.pnl >= 0 ? "text-success" : "text-destructive")}>
                          {t.pnl >= 0 ? "+" : ""}
                          {cur}
                          {Math.abs(t.pnl).toFixed(2)}
                        </p>
                        <p className={cn("text-[11px]", t.pnl >= 0 ? "text-success/70" : "text-destructive/70")}>
                          {t.pnl >= 0 ? "+" : ""}
                          {t.pnl_percent?.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : positions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No open {sheetTab === "Orders" ? "orders" : "positions"}
              </p>
            ) : (
              <div className="divide-y divide-border/40">
                {positions.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getSymbolMeta(p.symbol).icon}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.symbol}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Entry {p.entry_price.toFixed(2)} • {p.duration}s
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded text-white",
                          p.trade_type === "buy" ? "bg-success" : "bg-destructive"
                        )}
                      >
                        {p.trade_type.toUpperCase()}
                      </span>
                      <p className="text-sm font-semibold text-foreground mt-1 tabular-nums">
                        {cur}
                        {p.amount}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
