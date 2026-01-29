import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface RealPosition {
  id: string;
  user_id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  current_price: number;
  amount: number;
  leverage: number;
  pnl: number;
  pnl_percent: number;
  status: string;
  opened_at: string;
}

interface RealTradeHistory {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price: number;
  amount: number;
  pnl: number;
  pnl_percent: number;
  opened_at: string;
  closed_at: string;
  close_reason: string;
}

// We use demo_positions table for real trading too, with a flag
// For now, real trading uses the same infrastructure but deducts from real wallet
export const useRealTrading = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [positions, setPositions] = useState<RealPosition[]>([]);
  const [history, setHistory] = useState<RealTradeHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch open positions
  const fetchPositions = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("demo_positions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("opened_at", { ascending: false });

    if (error) {
      console.error("Error fetching positions:", error);
      return;
    }

    setPositions(data || []);
  }, [user]);

  // Fetch trade history
  const fetchHistory = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("demo_trade_history")
      .select("*")
      .eq("user_id", user.id)
      .order("closed_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching history:", error);
      return;
    }

    setHistory(data || []);
  }, [user]);

  // Initialize data
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchPositions();
      await fetchHistory();
      setLoading(false);
    };
    init();
  }, [fetchPositions, fetchHistory]);

  // Open a new real position (deduct from real wallet)
  const openRealPosition = async (
    symbol: string,
    tradeType: "buy" | "sell",
    amount: number,
    currentPrice: number,
    duration: number,
    walletBalance: number
  ) => {
    if (!user) {
      toast({ title: "Error", description: "Please log in to trade", variant: "destructive" });
      return null;
    }

    if (walletBalance < amount) {
      toast({ title: "Insufficient Balance", description: "Not enough balance in your wallet", variant: "destructive" });
      return null;
    }

    // Deduct from real wallet using RPC
    const { data: deductSuccess, error: deductError } = await supabase
      .rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: amount });

    if (deductError || !deductSuccess) {
      console.error("Error deducting from wallet:", deductError);
      toast({ title: "Error", description: "Failed to deduct from wallet", variant: "destructive" });
      return null;
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + duration * 1000).toISOString();

    // Create position
    const { data: position, error } = await supabase
      .from("demo_positions")
      .insert({
        user_id: user.id,
        symbol,
        trade_type: tradeType,
        entry_price: currentPrice,
        current_price: currentPrice,
        amount,
        leverage: 1,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("Error opening position:", error);
      // Refund the wallet if position creation fails
      await supabase.rpc("credit_user_wallet", { p_user_id: user.id, p_amount: amount });
      toast({ title: "Error", description: "Failed to open position", variant: "destructive" });
      return null;
    }

    await fetchPositions();
    return position;
  };

  // Close a position and credit wallet
  const closeRealPosition = async (positionId: string, exitPrice: number) => {
    if (!user) return;

    const position = positions.find(p => p.id === positionId);
    if (!position) return;

    // Calculate P&L (binary options style: win 84% or lose 100%)
    const isWin = position.trade_type === "buy" 
      ? exitPrice > position.entry_price 
      : exitPrice < position.entry_price;
    
    const pnl = isWin ? position.amount * 0.84 : -position.amount;
    const pnlPercent = isWin ? 84 : -100;

    // Update position
    const { error: posError } = await supabase
      .from("demo_positions")
      .update({
        status: "closed",
        current_price: exitPrice,
        pnl,
        pnl_percent: pnlPercent,
        closed_at: new Date().toISOString(),
        close_reason: "expired",
      })
      .eq("id", positionId);

    if (posError) {
      console.error("Error closing position:", posError);
      return;
    }

    // Credit wallet with return (if win, original + profit; if loss, nothing)
    if (isWin) {
      const returnAmount = position.amount + pnl;
      await supabase.rpc("credit_user_wallet", { p_user_id: user.id, p_amount: returnAmount });
    }

    // Create history entry
    await supabase.from("demo_trade_history").insert({
      user_id: user.id,
      position_id: positionId,
      symbol: position.symbol,
      trade_type: position.trade_type,
      entry_price: position.entry_price,
      exit_price: exitPrice,
      amount: position.amount,
      leverage: 1,
      pnl,
      pnl_percent: pnlPercent,
      duration_seconds: Math.floor((Date.now() - new Date(position.opened_at).getTime()) / 1000),
      opened_at: position.opened_at,
      close_reason: "expired",
    });

    toast({
      title: isWin ? "Trade Won! 🎉" : "Trade Lost",
      description: `${position.symbol}: ${isWin ? "+" : ""}₦${pnl.toFixed(2)}`,
      variant: isWin ? "default" : "destructive",
    });

    await fetchPositions();
    await fetchHistory();
  };

  return {
    positions,
    history,
    loading,
    openRealPosition,
    closeRealPosition,
    refetch: async () => {
      await fetchPositions();
      await fetchHistory();
    },
  };
};
