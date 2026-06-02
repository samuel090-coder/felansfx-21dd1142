import { useState, useEffect } from "react";
import { Bot, Play, Pause, Square, Zap, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AIBotPanelProps {
  unlocked: boolean;
  running: boolean;
  paused: boolean;
  stake: number;
  setStake: (n: number) => void;
  tradesToday: number;
  dailyLimit: number;
  balance: number;
  busy: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRenew: () => void;
}

export const AIBotPanel = ({
  unlocked, running, paused, stake, setStake, tradesToday, dailyLimit,
  balance, busy, onStart, onPause, onResume, onCancel, onRenew,
}: AIBotPanelProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [input, setInput] = useState(stake ? String(stake) : "");

  useEffect(() => {
    if (stake) setInput(String(stake));
  }, [stake]);

  if (!unlocked) return null;

  const limitReached = tradesToday >= dailyLimit;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-32 z-20 w-[92%] max-w-sm">
      <div className="rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-md shadow-lg overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-primary/15 to-primary/5"
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </span>
            AI Auto-Trader
          </span>
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
            running && !paused ? "bg-emerald-500/20 text-emerald-500" :
            paused ? "bg-amber-500/20 text-amber-500" : "bg-muted text-muted-foreground"
          )}>
            {running ? (paused ? "Paused" : "Trading…") : "Ready"}
          </span>
        </button>

        {!collapsed && (
          <div className="p-3 space-y-3">
            {/* Daily usage */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> Trades today
              </span>
              <span className="font-bold tabular-nums">{tradesToday}/{dailyLimit}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (tradesToday / dailyLimit) * 100)}%` }}
              />
            </div>

            {limitReached ? (
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  Daily limit reached — your AI bot has placed all {dailyLimit} trades for today.
                  Purchase or renew to keep trading.
                </p>
                <Button className="w-full gradient-primary font-bold h-10" onClick={onRenew}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Purchase / Renew
                </Button>
              </div>
            ) : !running ? (
              <>
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Enter your stake and the AI takes over — it opens and manages every
                    trade for you automatically. Just watch your chart.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Stake per trade (₦)</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="Enter amount"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onBlur={() => { const v = parseFloat(input); if (!isNaN(v)) setStake(Math.max(1, v)); }}
                    className="h-10 text-base font-bold"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Balance: ₦{balance.toLocaleString()}
                  </p>
                </div>

                <Button
                  className="w-full gradient-primary font-bold h-11"
                  disabled={busy}
                  onClick={() => { const v = parseFloat(input); setStake(Math.max(1, isNaN(v) ? 0 : v)); onStart(); }}
                >
                  {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                  Start AI Trading
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-primary/10 border border-primary/30 p-2 text-center">
                  <p className="text-[11px] text-muted-foreground">Trading with</p>
                  <p className="text-lg font-bold">₦{stake.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">per trade</span></p>
                </div>
                <div className="flex gap-2">
                  {paused ? (
                    <Button className="flex-1 h-10 gradient-primary font-bold" onClick={onResume}>
                      <Play className="w-4 h-4 mr-1" /> Resume
                    </Button>
                  ) : (
                    <Button variant="outline" className="flex-1 h-10 font-bold" onClick={onPause}>
                      <Pause className="w-4 h-4 mr-1" /> Pause
                    </Button>
                  )}
                  <Button variant="destructive" className="flex-1 h-10 font-bold" onClick={onCancel}>
                    <Square className="w-4 h-4 mr-1" /> Stop
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
