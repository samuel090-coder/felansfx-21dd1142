import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface DemoWallet {
  id: string;
  user_id: string;
  balance: number;
  total_pnl: number;
  total_trades: number;
  winning_trades: number;
}

interface DemoPosition {
  id: string;
  user_id: string;
  symbol: string;
  trade_type: string;
  entry_price: number;
  current_price: number;
  amount: number;
  leverage: number;
  stop_loss: number | null;
  take_profit: number | null;
  pnl: number;
  pnl_percent: number;
  status: string;
  opened_at: string;
}

interface TradeHistory {
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

export const useDemoTrading = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<DemoWallet | null>(null);
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [history, setHistory] = useState<TradeHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch or create demo wallet
  const fetchWallet = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("demo_wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching demo wallet:", error);
      return;
    }

    if (!data) {
      // Create new demo wallet with $10,000
      const { data: newWallet, error: createError } = await supabase
        .from("demo_wallets")
        .insert({ user_id: user.id, balance: 10000 })
        .select()
        .single();

      if (createError) {
        console.error("Error creating demo wallet:", createError);
        return;
      }
      setWallet(newWallet);
    } else {
      setWallet(data);
    }
  }, [user]);

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
      await fetchWallet();
      await fetchPositions();
      await fetchHistory();
      setLoading(false);
    };
    init();
  }, [fetchWallet, fetchPositions, fetchHistory]);

  // Open a new position
  const openPosition = async (
    symbol: string,
    tradeType: "buy" | "sell",
    amount: number,
    currentPrice: number,
    leverage: number = 1,
    stopLoss?: number,
    takeProfit?: number
  ) => {
    if (!user || !wallet) {
      toast({ title: "Error", description: "Please log in to trade", variant: "destructive" });
      return null;
    }

    const requiredBalance = amount;
    if (wallet.balance < requiredBalance) {
      toast({ title: "Insufficient Balance", description: "Not enough demo balance", variant: "destructive" });
      return null;
    }

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
        leverage,
        stop_loss: stopLoss || null,
        take_profit: takeProfit || null,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("Error opening position:", error);
      toast({ title: "Error", description: "Failed to open position", variant: "destructive" });
      return null;
    }

    // Deduct from wallet
    const { error: walletError } = await supabase
      .from("demo_wallets")
      .update({ balance: wallet.balance - amount })
      .eq("id", wallet.id);

    if (walletError) {
      console.error("Error updating wallet:", walletError);
    }

    toast({ 
      title: `${tradeType.toUpperCase()} Position Opened`, 
      description: `${symbol} @ ${currentPrice.toFixed(5)}` 
    });

    await fetchWallet();
    await fetchPositions();
    return position;
  };

  // Close a position
  const closePosition = async (positionId: string, exitPrice: number) => {
    if (!user || !wallet) return;

    const position = positions.find(p => p.id === positionId);
    if (!position) return;

    // Calculate P&L
    let pnl: number;
    if (position.trade_type === "buy") {
      pnl = (exitPrice - position.entry_price) * position.amount * position.leverage / position.entry_price;
    } else {
      pnl = (position.entry_price - exitPrice) * position.amount * position.leverage / position.entry_price;
    }
    const pnlPercent = (pnl / position.amount) * 100;

    // Update position
    const { error: posError } = await supabase
      .from("demo_positions")
      .update({
        status: "closed",
        current_price: exitPrice,
        pnl,
        pnl_percent: pnlPercent,
        closed_at: new Date().toISOString(),
        close_reason: "manual",
      })
      .eq("id", positionId);

    if (posError) {
      console.error("Error closing position:", posError);
      return;
    }

    // Create history entry
    const openedAt = new Date(position.opened_at);
    const closedAt = new Date();
    const durationSeconds = Math.floor((closedAt.getTime() - openedAt.getTime()) / 1000);

    await supabase.from("demo_trade_history").insert({
      user_id: user.id,
      position_id: positionId,
      symbol: position.symbol,
      trade_type: position.trade_type,
      entry_price: position.entry_price,
      exit_price: exitPrice,
      amount: position.amount,
      leverage: position.leverage,
      pnl,
      pnl_percent: pnlPercent,
      duration_seconds: durationSeconds,
      opened_at: position.opened_at,
      close_reason: "manual",
    });

    // Update wallet
    const newBalance = wallet.balance + position.amount + pnl;
    const isWin = pnl > 0;
    
    await supabase
      .from("demo_wallets")
      .update({
        balance: newBalance,
        total_pnl: wallet.total_pnl + pnl,
        total_trades: wallet.total_trades + 1,
        winning_trades: wallet.winning_trades + (isWin ? 1 : 0),
      })
      .eq("id", wallet.id);

    toast({
      title: `Position Closed`,
      description: `${position.symbol}: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)`,
      variant: pnl >= 0 ? "default" : "destructive",
    });

    await fetchWallet();
    await fetchPositions();
    await fetchHistory();
  };

  // Update position P&L based on current price
  const updatePositionPnL = useCallback((positionId: string, currentPrice: number) => {
    setPositions(prev => prev.map(p => {
      if (p.id !== positionId) return p;
      
      let pnl: number;
      if (p.trade_type === "buy") {
        pnl = (currentPrice - p.entry_price) * p.amount * p.leverage / p.entry_price;
      } else {
        pnl = (p.entry_price - currentPrice) * p.amount * p.leverage / p.entry_price;
      }
      const pnlPercent = (pnl / p.amount) * 100;
      
      return { ...p, current_price: currentPrice, pnl, pnl_percent: pnlPercent };
    }));
  }, []);

  // Reset demo account
  const resetAccount = async () => {
    if (!user || !wallet) return;

    // Close all positions
    await supabase
      .from("demo_positions")
      .update({ status: "closed", close_reason: "reset" })
      .eq("user_id", user.id)
      .eq("status", "open");

    // Reset wallet
    await supabase
      .from("demo_wallets")
      .update({
        balance: 10000,
        total_pnl: 0,
        total_trades: 0,
        winning_trades: 0,
      })
      .eq("id", wallet.id);

    toast({ title: "Account Reset", description: "Demo balance restored to $10,000" });

    await fetchWallet();
    await fetchPositions();
    await fetchHistory();
  };

  return {
    wallet,
    positions,
    history,
    loading,
    openPosition,
    closePosition,
    updatePositionPnL,
    resetAccount,
    refetch: async () => {
      await fetchWallet();
      await fetchPositions();
      await fetchHistory();
    },
  };
};
