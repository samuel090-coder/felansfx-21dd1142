import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Plus, Target, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TradingControlsProps {
  symbol: string;
  currentPrice: number;
  balance: number;
  onTrade: (
    type: "buy" | "sell",
    amount: number,
    leverage: number,
    stopLoss?: number,
    takeProfit?: number
  ) => void;
  disabled?: boolean;
}

export const TradingControls = ({
  symbol,
  currentPrice,
  balance,
  onTrade,
  disabled = false,
}: TradingControlsProps) => {
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(1);
  const [useStopLoss, setUseStopLoss] = useState(false);
  const [useTakeProfit, setUseTakeProfit] = useState(false);
  const [stopLossPercent, setStopLossPercent] = useState(2);
  const [takeProfitPercent, setTakeProfitPercent] = useState(4);

  const quickAmounts = [50, 100, 250, 500, 1000];
  const leverageOptions = [1, 2, 5, 10, 20, 50];

  const calculateStopLoss = (type: "buy" | "sell") => {
    if (!useStopLoss) return undefined;
    const change = (currentPrice * stopLossPercent) / 100;
    return type === "buy" ? currentPrice - change : currentPrice + change;
  };

  const calculateTakeProfit = (type: "buy" | "sell") => {
    if (!useTakeProfit) return undefined;
    const change = (currentPrice * takeProfitPercent) / 100;
    return type === "buy" ? currentPrice + change : currentPrice - change;
  };

  const handleTrade = (type: "buy" | "sell") => {
    if (amount > balance) return;
    onTrade(
      type,
      amount,
      leverage,
      calculateStopLoss(type),
      calculateTakeProfit(type)
    );
  };

  const potentialPnL = (amount * leverage * takeProfitPercent) / 100;
  const potentialLoss = (amount * leverage * stopLossPercent) / 100;

  return (
    <div className="space-y-4">
      {/* Amount Selection */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Investment Amount</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => setAmount(Math.max(10, amount - 10))}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(10, Math.min(balance, Number(e.target.value))))}
              className="text-center text-xl font-bold pl-6"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => setAmount(Math.min(balance, amount + 10))}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-1.5">
          {quickAmounts.map(q => (
            <Button
              key={q}
              variant={amount === q ? "secondary" : "outline"}
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => setAmount(Math.min(balance, q))}
              disabled={q > balance}
            >
              ${q}
            </Button>
          ))}
        </div>
      </div>

      {/* Leverage */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3" /> Leverage
          </Label>
          <span className="text-sm font-bold">{leverage}x</span>
        </div>
        <div className="flex gap-1.5">
          {leverageOptions.map(l => (
            <Button
              key={l}
              variant={leverage === l ? "secondary" : "outline"}
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => setLeverage(l)}
            >
              {l}x
            </Button>
          ))}
        </div>
      </div>

      {/* Stop Loss & Take Profit */}
      <div className="grid grid-cols-2 gap-3">
        <Card className={cn("border-2", useStopLoss ? "border-red-500/30" : "border-transparent")}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-500" /> Stop Loss
              </Label>
              <Switch checked={useStopLoss} onCheckedChange={setUseStopLoss} />
            </div>
            {useStopLoss && (
              <div className="space-y-1">
                <Slider
                  value={[stopLossPercent]}
                  onValueChange={([v]) => setStopLossPercent(v)}
                  min={0.5}
                  max={10}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">-{stopLossPercent}%</span>
                  <span className="text-red-500">-${potentialLoss.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn("border-2", useTakeProfit ? "border-green-500/30" : "border-transparent")}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <Target className="w-3 h-3 text-green-500" /> Take Profit
              </Label>
              <Switch checked={useTakeProfit} onCheckedChange={setUseTakeProfit} />
            </div>
            {useTakeProfit && (
              <div className="space-y-1">
                <Slider
                  value={[takeProfitPercent]}
                  onValueChange={([v]) => setTakeProfitPercent(v)}
                  min={1}
                  max={20}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">+{takeProfitPercent}%</span>
                  <span className="text-green-500">+${potentialPnL.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Buy/Sell Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-14 bg-red-600 hover:bg-red-700 text-white font-bold text-lg"
          onClick={() => handleTrade("sell")}
          disabled={disabled || amount > balance}
        >
          <TrendingDown className="w-5 h-5 mr-2" />
          SELL
        </Button>
        <Button
          size="lg"
          className="h-14 bg-green-600 hover:bg-green-700 text-white font-bold text-lg"
          onClick={() => handleTrade("buy")}
          disabled={disabled || amount > balance}
        >
          <TrendingUp className="w-5 h-5 mr-2" />
          BUY
        </Button>
      </div>

      {amount > balance && (
        <p className="text-xs text-red-500 text-center">Insufficient balance</p>
      )}
    </div>
  );
};
