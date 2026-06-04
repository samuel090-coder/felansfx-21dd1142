import { useState, useRef, useEffect } from "react";
import { Minus, Plus, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Cpu, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TradingBottomControlsProps {
  balance: number;
  currentPrice: number;
  symbol: string;
  onTrade: (type: "buy" | "sell", amount: number, duration: number) => void;
  disabled?: boolean;
  accountType: "demo" | "real";
  prefilledAmount?: number;
  prefilledDuration?: number;
  /** Opens the AI trading assistant — real account only. */
  onAiTrading?: () => void;
  /** Whether the AI auto-trader is currently running. */
  aiActive?: boolean;
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
  prefilledAmount,
  prefilledDuration,
  onAiTrading,
  aiActive,
}: TradingBottomControlsProps) => {
  const [investment, setInvestment] = useState(50);
  const [durationIndex, setDurationIndex] = useState(0);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Apply prefilled values from challenge / signal redirects
  useEffect(() => {
    if (prefilledAmount && prefilledAmount > 0) setInvestment(prefilledAmount);
  }, [prefilledAmount]);
  useEffect(() => {
    if (prefilledDuration && prefilledDuration > 0) {
      const idx = DURATIONS.indexOf(prefilledDuration);
      if (idx >= 0) setDurationIndex(idx);
    }
  }, [prefilledDuration]);

  const duration = DURATIONS[durationIndex];
  const currencySymbol = accountType === "demo" ? "$" : "₦";
  const showAi = accountType === "real" && !!onAiTrading;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
  };

  const adjustInvestment = (delta: number) => {
    const newAmount = Math.max(1, Math.min(balance, investment + delta));
    setInvestment(newAmount);
  };

  const cycleDuration = (direction: number) => {
    const newIndex = (durationIndex + direction + DURATIONS.length) % DURATIONS.length;
    setDurationIndex(newIndex);
  };

  const handleAmountClick = () => {
    setInputValue(investment.toString());
    setIsEditingAmount(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleAmountSubmit = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 1) {
      setInvestment(Math.min(balance, Math.max(1, parsed)));
    }
    setIsEditingAmount(false);
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAmountSubmit();
    } else if (e.key === "Escape") {
      setIsEditingAmount(false);
    }
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
        description: `Maximum you can invest: ${currencySymbol}${balance.toFixed(2)}`,
      });
      return;
    }
    if (investment < 1) {
      toast.error("Minimum investment is 1");
      return;
    }
    onTrade(type, investment, duration);
  };

  return (
    <div className="bg-gradient-to-b from-card/80 to-card border-t border-border/40 backdrop-blur-xl p-3 space-y-3">
      {/* Controls Row: Investment · Auto Close · Win Rate */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Investment Control */}
        <div className="rounded-2xl border border-border/40 bg-muted/40 backdrop-blur-md px-2 py-2 shadow-sm">
          <p className="text-[10px] text-muted-foreground text-center mb-1">Investment</p>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/60"
              onClick={() => adjustInvestment(-10)}
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <div className="text-center flex-1 min-w-0" onClick={handleAmountClick}>
              {isEditingAmount ? (
                <div className="flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">{currencySymbol}</span>
                  <Input
                    ref={inputRef}
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleAmountSubmit}
                    onKeyDown={handleAmountKeyDown}
                    className="w-14 h-6 text-center text-sm font-bold bg-transparent border-0 border-b-2 border-primary p-0 focus-visible:ring-0"
                    min={1}
                    max={balance}
                  />
                </div>
              ) : (
                <p className="text-base font-bold text-foreground cursor-pointer hover:text-primary transition-colors truncate tabular-nums">
                  {currencySymbol}{investment}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/60"
              onClick={() => adjustInvestment(10)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Duration Control */}
        <div className="rounded-2xl border border-border/40 bg-muted/40 backdrop-blur-md px-2 py-2 shadow-sm">
          <p className="text-[10px] text-muted-foreground text-center mb-1">Auto Close</p>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/60"
              onClick={() => cycleDuration(-1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <p className="text-base font-bold text-foreground tabular-nums flex-1 text-center">
              {formatDuration(duration)}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/60"
              onClick={() => cycleDuration(1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Win Rate */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-md px-2 py-2 shadow-sm">
          <p className="text-[10px] text-muted-foreground text-center mb-1 flex items-center justify-center gap-1">
            Win Rate <Info className="w-2.5 h-2.5" />
          </p>
          <p className="text-base font-bold text-emerald-500 text-center tabular-nums">
            {PAYOUT_PERCENT}%
          </p>
        </div>
      </div>

      {/* Action Buttons: SELL · AI TRADING · BUY */}
      <div className={cn("grid gap-2.5", showAi ? "grid-cols-[1fr_1.15fr_1fr]" : "grid-cols-2")}>
        {/* Sell Button */}
        <Button
          onClick={() => handleTrade("sell")}
          disabled={disabled}
          className={cn(
            "h-16 flex flex-col items-center justify-center gap-0.5",
            "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
            "text-white font-bold rounded-2xl border-0 relative overflow-hidden shadow-lg shadow-red-600/20"
          )}
        >
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            <TrendingDown className="w-7 h-7 text-red-200/40" />
          </div>
          <span className="text-lg font-bold tracking-wide">SELL</span>
          <span className="text-xs opacity-90 tabular-nums">{PAYOUT_PERCENT}%</span>
        </Button>

        {/* AI Trading Button (real account only) */}
        {showAi && (
          <Button
            onClick={onAiTrading}
            disabled={disabled}
            className={cn(
              "h-16 flex flex-col items-center justify-center gap-0.5",
              "bg-gradient-to-br from-primary via-primary to-blue-600 hover:opacity-95",
              "text-primary-foreground font-bold rounded-2xl border-0 relative overflow-hidden",
              "shadow-lg shadow-primary/40 ring-2 ring-primary/30",
              "before:absolute before:inset-0 before:bg-white/10 before:animate-pulse before:rounded-2xl",
              aiActive && "ring-emerald-400/60"
            )}
          >
            {aiActive && (
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_2px] shadow-emerald-400/60" />
            )}
            <Cpu className="w-5 h-5 relative z-10" />
            <span className="text-sm font-extrabold tracking-wide relative z-10">AI TRADING</span>
          </Button>
        )}

        {/* Buy Button */}
        <Button
          onClick={() => handleTrade("buy")}
          disabled={disabled}
          className={cn(
            "h-16 flex flex-col items-center justify-center gap-0.5",
            "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
            "text-white font-bold rounded-2xl border-0 relative overflow-hidden shadow-lg shadow-emerald-600/20"
          )}
        >
          <span className="text-lg font-bold tracking-wide">BUY</span>
          <span className="text-xs opacity-90 tabular-nums">{PAYOUT_PERCENT}%</span>
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <TrendingUp className="w-7 h-7 text-emerald-200/40" />
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
                hour12: false,
              })}
            </span>
          );
        })}
      </div>
    </div>
  );
};
