import { useState } from "react";
import { Minus, Plus, ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TradingBottomControlsProps {
  balance: number;
  currentPrice: number;
  symbol: string;
  onTrade: (type: "buy" | "sell", amount: number, duration: number) => void;
  disabled?: boolean;
  accountType: "demo" | "real";
}

const DURATIONS = [30, 60, 120, 300, 600]; // seconds
const PAYOUT_PERCENT = 84;

export const TradingBottomControls = ({
  balance,
  currentPrice,
  symbol,
  onTrade,
  disabled,
  accountType,
}: TradingBottomControlsProps) => {
  const [investment, setInvestment] = useState(50);
  const [durationIndex, setDurationIndex] = useState(0);

  const duration = DURATIONS[durationIndex];

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:00`;
  };

  const adjustInvestment = (delta: number) => {
    const newAmount = Math.max(1, Math.min(balance, investment + delta));
    setInvestment(newAmount);
  };

  const cycleDuration = (direction: number) => {
    const newIndex = (durationIndex + direction + DURATIONS.length) % DURATIONS.length;
    setDurationIndex(newIndex);
  };

  const handleTrade = (type: "buy" | "sell") => {
    if (disabled) {
      toast.error("Trading not available", {
        description: "Please wait for your account to load",
      });
      return;
    }
    if (balance <= 0) {
      toast.error("No balance available", {
        description: accountType === "demo" ? "Your demo balance is empty" : "Fund your real account to trade",
      });
      return;
    }
    if (investment > balance) {
      toast.error("Insufficient balance", {
        description: `Maximum you can invest: ${accountType === "demo" ? "$" : "₦"}${balance.toFixed(2)}`,
      });
      return;
    }
    if (investment < 1) {
      toast.error("Minimum investment is $1");
      return;
    }
    onTrade(type, investment, duration);
  };

  return (
    <div className="bg-[hsl(222,47%,11%)] border-t border-border/30 p-3 space-y-3">
      {/* Investment and Duration Row */}
      <div className="flex gap-3">
        {/* Investment Control */}
        <div className="flex-1 flex items-center justify-between bg-[hsl(222,47%,14%)] rounded-lg border border-border/30 px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => adjustInvestment(-10)}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">
              {accountType === "demo" ? "$" : "₦"}{investment}
            </p>
            <p className="text-xs text-muted-foreground">investment</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => adjustInvestment(10)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Duration Control */}
        <div className="flex-1 flex items-center justify-between bg-[hsl(222,47%,14%)] rounded-lg border border-border/30 px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => cycleDuration(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground tabular-nums">
              {formatDuration(duration)}
            </p>
            <p className="text-xs text-muted-foreground">auto close</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => cycleDuration(1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Buy/Sell Buttons */}
      <div className="flex gap-3">
        {/* Sell Button */}
        <Button
          onClick={() => handleTrade("sell")}
          disabled={disabled}
          className={cn(
            "flex-1 h-16 flex flex-col items-center justify-center gap-0.5",
            "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
            "text-white font-bold rounded-lg border-0 relative overflow-hidden"
          )}
        >
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <TrendingDown className="w-8 h-8 text-red-300/50" />
          </div>
          <span className="text-xl font-bold">SELL</span>
          <span className="text-sm opacity-80">{PAYOUT_PERCENT}%</span>
        </Button>

        {/* Buy Button */}
        <Button
          onClick={() => handleTrade("buy")}
          disabled={disabled}
          className={cn(
            "flex-1 h-16 flex flex-col items-center justify-center gap-0.5",
            "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
            "text-white font-bold rounded-lg border-0 relative overflow-hidden"
          )}
        >
          <span className="text-xl font-bold">BUY</span>
          <span className="text-sm opacity-80">{PAYOUT_PERCENT}%</span>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <TrendingUp className="w-8 h-8 text-emerald-300/50" />
          </div>
        </Button>
      </div>

      {/* Time Axis */}
      <div className="flex justify-between text-xs text-muted-foreground px-2">
        {Array.from({ length: 5 }).map((_, i) => {
          const now = new Date();
          now.setMinutes(now.getMinutes() + i);
          return (
            <span key={i} className="tabular-nums">
              {now.toLocaleTimeString("en-US", { 
                hour: "2-digit", 
                minute: "2-digit",
                hour12: false 
              })}
            </span>
          );
        })}
      </div>
    </div>
  );
};
