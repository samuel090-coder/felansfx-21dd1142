import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, TrendingUp, TrendingDown, Target, AlertTriangle, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface DailySignal {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: string;
  stop_loss: string;
  take_profit: string;
  risk_reward: string | null;
  notes: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
}

export const DailySignalsManager = () => {
  const [signals, setSignals] = useState<DailySignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    symbol: "",
    trade_type: "buy" as "buy" | "sell",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    risk_reward: "",
    notes: "",
  });

  const fetchSignals = async () => {
    const { data, error } = await supabase
      .from("daily_signals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch signals");
      return;
    }
    setSignals(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const handleSubmit = async () => {
    if (!formData.symbol || !formData.entry_price || !formData.stop_loss || !formData.take_profit) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { error } = await supabase.from("daily_signals").insert({
      symbol: formData.symbol.toUpperCase(),
      trade_type: formData.trade_type,
      entry_price: formData.entry_price,
      stop_loss: formData.stop_loss,
      take_profit: formData.take_profit,
      risk_reward: formData.risk_reward || null,
      notes: formData.notes || null,
    });

    if (error) {
      toast.error("Failed to create signal");
      return;
    }

    toast.success("Signal posted!");
   
   // Send push notification to all subscribers
   try {
     await supabase.functions.invoke("send-push", {
       body: {
         title: "🎯 New Trading Signal",
         message: `${formData.symbol} ${formData.trade_type.toUpperCase()} signal posted. Entry: ${formData.entry_price}`,
         url: "/daily-streak",
       },
     });
   } catch (pushError) {
     console.error("Failed to send push notification:", pushError);
   }
   
    setFormData({
      symbol: "",
      trade_type: "buy",
      entry_price: "",
      stop_loss: "",
      take_profit: "",
      risk_reward: "",
      notes: "",
    });
    setShowForm(false);
    fetchSignals();
  };

  const updateStatus = async (id: string, status: string) => {
   const signal = signals.find((s) => s.id === id);
   
    const { error } = await supabase
      .from("daily_signals")
      .update({ status, is_active: status === "active" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success("Status updated!");
   
   // Send push notification if status changed to hit_tp or hit_sl
   if ((status === "hit_tp" || status === "hit_sl") && signal) {
     try {
       await supabase.functions.invoke("send-push", {
         body: {
           title: status === "hit_tp" ? "✅ Take Profit Hit!" : "🛑 Stop Loss Hit",
           message: `${signal.symbol} signal ${status === "hit_tp" ? "reached take profit" : "hit stop loss"}`,
           url: "/daily-streak",
         },
       });
     } catch (pushError) {
       console.error("Failed to send push notification:", pushError);
     }
   }
   
    fetchSignals();
  };

  const deleteSignal = async (id: string) => {
    const { error } = await supabase.from("daily_signals").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete signal");
      return;
    }
    toast.success("Signal deleted!");
    fetchSignals();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-primary">Active</Badge>;
      case "hit_tp":
        return <Badge className="bg-green-500">Hit TP ✓</Badge>;
      case "hit_sl":
        return <Badge className="bg-red-500">Hit SL ✗</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Daily Trading Signals</h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> New Signal
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Post New Signal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Symbol (e.g., EURUSD)"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              />
              <Select
                value={formData.trade_type}
                onValueChange={(v) => setFormData({ ...formData, trade_type: v as "buy" | "sell" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">BUY</SelectItem>
                  <SelectItem value="sell">SELL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                placeholder="Entry Price"
                value={formData.entry_price}
                onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
              />
              <Input
                placeholder="Stop Loss"
                value={formData.stop_loss}
                onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
              />
              <Input
                placeholder="Take Profit"
                value={formData.take_profit}
                onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
              />
            </div>
            <Input
              placeholder="Risk/Reward (e.g., 1:2)"
              value={formData.risk_reward}
              onChange={(e) => setFormData({ ...formData, risk_reward: e.target.value })}
            />
            <Textarea
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1">Post Signal</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No signals posted yet</p>
        ) : (
          signals.map((signal) => (
            <Card key={signal.id} className="border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {signal.trade_type === "buy" ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-bold">{signal.symbol}</span>
                      <Badge variant={signal.trade_type === "buy" ? "default" : "destructive"}>
                        {signal.trade_type.toUpperCase()}
                      </Badge>
                      {getStatusBadge(signal.status)}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Entry:</span>
                        <span className="font-medium">{signal.entry_price}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span className="text-muted-foreground">SL:</span>
                        <span className="font-medium text-red-500">{signal.stop_loss}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-green-500" />
                        <span className="text-muted-foreground">TP:</span>
                        <span className="font-medium text-green-500">{signal.take_profit}</span>
                      </div>
                    </div>
                    {signal.risk_reward && (
                      <p className="text-xs text-muted-foreground">R:R {signal.risk_reward}</p>
                    )}
                    {signal.notes && (
                      <p className="text-xs text-muted-foreground">{signal.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Select
                      value={signal.status}
                      onValueChange={(v) => updateStatus(signal.id, v)}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="hit_tp">Hit TP</SelectItem>
                        <SelectItem value="hit_sl">Hit SL</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSignal(signal.id)}
                      className="text-destructive h-8"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
