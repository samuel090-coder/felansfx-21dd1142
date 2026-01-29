import { Wallet, TrendingUp, Activity, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AccountStatsProps {
  balance: number;
  totalPnl: number;
  totalTrades: number;
  winningTrades: number;
}

export const AccountStats = ({ balance, totalPnl, totalTrades, winningTrades }: AccountStatsProps) => {
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const isProfitable = totalPnl >= 0;

  return (
    <div className="grid grid-cols-2 gap-2">
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-bold">${balance.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isProfitable ? "bg-green-500/10" : "bg-red-500/10"
          )}>
            <TrendingUp className={cn("w-5 h-5", isProfitable ? "text-green-500" : "text-red-500")} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total P&L</p>
            <p className={cn("text-lg font-bold", isProfitable ? "text-green-500" : "text-red-500")}>
              {isProfitable ? "+" : ""}${totalPnl.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Trades</p>
            <p className="text-lg font-bold">{totalTrades}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            winRate >= 50 ? "bg-green-500/10" : "bg-amber-500/10"
          )}>
            <Target className={cn("w-5 h-5", winRate >= 50 ? "text-green-500" : "text-amber-500")} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className={cn("text-lg font-bold", winRate >= 50 ? "text-green-500" : "text-amber-500")}>
              {winRate.toFixed(0)}%
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
