import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Props {
  tradeId: string;
}

export const TradePreviewCard = ({ tradeId }: Props) => {
  const navigate = useNavigate();
  const [trade, setTrade] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("demo_trade_history")
      .select("id, symbol, trade_type, pnl, pnl_percent, entry_price, exit_price, amount")
      .eq("id", tradeId)
      .maybeSingle()
      .then(({ data }) => setTrade(data));
  }, [tradeId]);

  if (!trade) return null;
  const isWin = trade.pnl > 0;

  return (
    <div
      onClick={() => navigate(`/trade/${trade.id}`)}
      className={`rounded-xl p-3 cursor-pointer border transition-colors ${
        isWin ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10' : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isWin ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
          <span className="font-semibold text-sm">{trade.symbol}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{trade.trade_type.toUpperCase()}</Badge>
        </div>
        <span className={`font-bold text-sm ${isWin ? 'text-green-500' : 'text-red-500'}`}>
          {isWin ? '+' : ''}{trade.pnl.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>${trade.amount} stake</span>
        <span>{isWin ? '+' : ''}{trade.pnl_percent.toFixed(1)}%</span>
      </div>
    </div>
  );
};
