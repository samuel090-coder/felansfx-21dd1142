import { useState, useEffect } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradeSound } from "@/hooks/useTradeSound";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface Position {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  amount: number;
  opened_at: string;
  duration: number; // seconds until expiry
}

interface ActivePositionsProps {
  positions: Position[];
  currentPrice: number;
  onExpire: (positionId: string, exitPrice: number) => void;
  onClose: (positionId: string, exitPrice: number) => void;
  accountType: "demo" | "real";
}

export const ActivePositions = ({
  positions,
  currentPrice,
  onExpire,
  onClose,
  accountType,
}: ActivePositionsProps) => {
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const [isMinimized, setIsMinimized] = useState(false);
  const { playWinSound, playLossSound, playTickSound } = useTradeSound();
  const { vibrateWin, vibrateLoss, vibrateTick } = useHapticFeedback();

  // Initialize and update countdowns
  useEffect(() => {
    if (positions.length === 0) return;

    const updateCountdowns = () => {
      const now = Date.now();
      const newCountdowns: Record<string, number> = {};
      
      positions.forEach((pos) => {
        const openedTime = new Date(pos.opened_at).getTime();
        const expiryTime = openedTime + (pos.duration * 1000);
        const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
        newCountdowns[pos.id] = remaining;
        
        // Check for expiry
        if (remaining === 0) {
          // Determine win/loss
          const isWin = pos.trade_type === "buy" 
            ? currentPrice > pos.entry_price 
            : currentPrice < pos.entry_price;
          
          if (isWin) {
            playWinSound();
            vibrateWin();
          } else {
            playLossSound();
            vibrateLoss();
          }
          
          onExpire(pos.id, currentPrice);
        } else if (remaining <= 5 && remaining > 0) {
          // Play tick sound in last 5 seconds
          playTickSound();
          vibrateTick();
        }
      });
      
      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    
    return () => clearInterval(interval);
  }, [positions, currentPrice, onExpire, playWinSound, playLossSound, playTickSound, vibrateWin, vibrateLoss, vibrateTick]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (positions.length === 0) return null;

  return (
    <div className="absolute top-24 right-2 z-20 flex flex-col gap-2 max-w-[200px]">
      {/* Toggle button */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="self-end bg-card/80 backdrop-blur-sm border border-border rounded-lg px-2 py-1 flex items-center gap-1"
      >
        <span className="text-[10px] text-muted-foreground">{positions.length} active</span>
        {isMinimized ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {/* Position cards - collapsible */}
      {!isMinimized && positions.map((pos) => {
        const remaining = countdowns[pos.id] || 0;
        const isWinning = pos.trade_type === "buy" 
          ? currentPrice > pos.entry_price 
          : currentPrice < pos.entry_price;
        const pnlPercent = isWinning ? 84 : -100;
        const pnl = isWinning ? pos.amount * 0.84 : -pos.amount;
        
        return (
          <div
            key={pos.id}
            className={cn(
              "rounded-lg p-2 backdrop-blur-sm border",
              isWinning 
                ? "bg-emerald-500/20 border-emerald-500/50" 
                : "bg-red-500/20 border-red-500/50"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <span className={cn(
                  "text-xs font-bold px-1 rounded",
                  pos.trade_type === "buy" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                )}>
                  {pos.trade_type.toUpperCase()}
                </span>
                <span className="text-xs text-foreground font-medium">{pos.symbol}</span>
              </div>
              <button
                onClick={() => onClose(pos.id, currentPrice)}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {accountType === "demo" ? "$" : "₦"}{pos.amount}
              </span>
              <span className={cn(
                "text-sm font-bold tabular-nums",
                isWinning ? "text-emerald-400" : "text-red-400"
              )}>
                {isWinning ? "+" : ""}{accountType === "demo" ? "$" : "₦"}{pnl.toFixed(2)}
              </span>
            </div>
            
            {/* Countdown timer */}
            <div className="mt-1.5">
              <div className={cn(
                "text-center text-lg font-bold tabular-nums",
                remaining <= 10 ? "text-red-400 animate-pulse" : "text-foreground"
              )}>
                {formatTime(remaining)}
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    isWinning ? "bg-emerald-500" : "bg-red-500"
                  )}
                  style={{ 
                    width: `${Math.min(100, (remaining / 60) * 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
