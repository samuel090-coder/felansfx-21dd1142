import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Ticket, TrendingUp, TrendingDown, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

interface SignalData {
  symbol: string;
  code: string;
  type: "BUY" | "SELL";
  entry: string;
  sl: string;
  tp: string;
  rr: string;
  live_price?: number;
}

interface SignalCodeRedeemerProps {
  onExecuteTrade: (symbol: string, tradeType: "buy" | "sell", amount: number, duration: number) => Promise<void>;
  onSymbolChange: (symbol: string) => void;
  accountType: "demo" | "real";
}

export const SignalCodeRedeemer = ({ onExecuteTrade, onSymbolChange, accountType }: SignalCodeRedeemerProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [signal, setSignal] = useState<SignalData | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [amount, setAmount] = useState("100");
  const [duration, setDuration] = useState(60);
  const [executing, setExecuting] = useState(false);

  const fetchSignal = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed.startsWith("SIG-")) {
      toast.error("Invalid signal code", { description: "Codes start with SIG-" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("signal_data, created_at")
        .eq("message_type", "signal")
        .not("signal_data", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const match = data?.find((msg: any) => msg.signal_data?.code === trimmed);
      if (!match) {
        toast.error("Signal not found", { description: "Check the code and try again" });
        setLoading(false);
        return;
      }

      setSignal(match.signal_data as unknown as SignalData);
      setShowDialog(true);
    } catch {
      toast.error("Failed to fetch signal");
    }
    setLoading(false);
  };

  const executeSignalTrade = async () => {
    if (!signal) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < (accountType === "real" ? 50 : 1)) {
      toast.error(`Min stake is ${accountType === "real" ? "₦50" : "$1"}`);
      return;
    }

    setExecuting(true);
    try {
      onSymbolChange(signal.symbol);
      // Small delay to let price simulation switch symbol
      await new Promise(r => setTimeout(r, 500));
      await onExecuteTrade(signal.symbol, signal.type.toLowerCase() as "buy" | "sell", amt, duration);
      setShowDialog(false);
      setCode("");
      setSignal(null);
      toast.success("Signal trade executed! 🚀");
    } catch {
      toast.error("Failed to execute trade");
    }
    setExecuting(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 bg-card/50 border-b border-border">
        <Ticket className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Paste signal code (SIG-...)"
          className="h-8 text-xs bg-background/50 font-mono"
          onKeyDown={e => e.key === "Enter" && fetchSignal()}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={fetchSignal}
          disabled={loading || !code.trim()}
          className="h-8 px-3 text-xs shrink-0"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Use"}
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {signal?.type === "BUY" ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              {signal?.type} {signal?.symbol}
            </DialogTitle>
            <DialogDescription>Execute this signal trade on your {accountType} account</DialogDescription>
          </DialogHeader>

          {signal && (
            <div className="space-y-4">
              {/* Signal details */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Direction</span>
                  <Badge variant={signal.type === "BUY" ? "default" : "destructive"} className="text-xs">
                    {signal.type}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry</span>
                  <span className="font-mono font-medium">{signal.entry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stop Loss</span>
                  <span className="font-mono text-red-400">{signal.sl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Take Profit</span>
                  <span className="font-mono text-green-400">{signal.tp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">R:R Ratio</span>
                  <span className="font-medium">1:{signal.rr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code</span>
                  <span className="font-mono text-xs text-muted-foreground">{signal.code}</span>
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Stake Amount ({accountType === "real" ? "₦" : "$"})
                </label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={accountType === "real" ? "Min ₦50" : "Min $1"}
                  className="font-mono"
                />
              </div>

              {/* Duration selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 120, 300].map(d => (
                    <Button
                      key={d}
                      size="sm"
                      variant={duration === d ? "default" : "outline"}
                      onClick={() => setDuration(d)}
                      className="text-xs"
                    >
                      {d < 60 ? `${d}s` : `${d / 60}m`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Execute button */}
              <Button
                onClick={executeSignalTrade}
                disabled={executing}
                className="w-full gap-2"
                size="lg"
              >
                {executing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {executing ? "Executing..." : "Start Trade"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
