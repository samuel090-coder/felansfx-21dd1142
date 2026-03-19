import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export type AlertType = "losing_streak" | "high_risk" | "study_reminder" | "switch_demo" | "take_break";

interface SmartAlert {
  type: AlertType;
  title: string;
  message: string;
  action: string;
  actionRoute: string;
  severity: "info" | "warning" | "danger";
}

export const useSmartAlerts = (accountType: "demo" | "real") => {
  const { user } = useAuth();
  const [alert, setAlert] = useState<SmartAlert | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkTradingPatterns = useCallback(async () => {
    if (!user || dismissed) return;

    // Fetch recent trades (last 10)
    const { data: recentTrades } = await supabase
      .from("demo_trade_history")
      .select("pnl, account_type, closed_at")
      .eq("user_id", user.id)
      .eq("account_type", accountType)
      .order("closed_at", { ascending: false })
      .limit(10);

    if (!recentTrades || recentTrades.length < 3) return;

    const last5 = recentTrades.slice(0, 5);
    const losses = last5.filter(t => t.pnl < 0).length;
    const consecutiveLosses = getConsecutiveLosses(recentTrades);

    // 5 consecutive losses → strong warning
    if (consecutiveLosses >= 5) {
      setAlert({
        type: "take_break",
        title: "🛑 Take a Break!",
        message: `You've lost ${consecutiveLosses} trades in a row. Step back, clear your mind, and come back stronger.`,
        action: "Go to School Hub",
        actionRoute: "/school",
        severity: "danger",
      });
      return;
    }

    // 3 consecutive losses → suggest study
    if (consecutiveLosses >= 3) {
      setAlert({
        type: "losing_streak",
        title: "📉 Losing Streak Detected",
        message: `${consecutiveLosses} losses in a row. Consider studying chart patterns before your next trade.`,
        action: accountType === "real" ? "Switch to Demo" : "Study Patterns",
        actionRoute: accountType === "real" ? "" : "/patterns",
        severity: "warning",
      });
      return;
    }

    // 4 out of 5 losses → suggest demo
    if (losses >= 4 && accountType === "real") {
      setAlert({
        type: "switch_demo",
        title: "💡 Practice Makes Perfect",
        message: "You lost 4 of your last 5 trades. Try demo mode to practice without risking real money.",
        action: "Switch to Demo",
        actionRoute: "",
        severity: "warning",
      });
      return;
    }

    // All good - clear alert
    setAlert(null);
  }, [user, accountType, dismissed]);

  useEffect(() => {
    checkTradingPatterns();
    const interval = setInterval(checkTradingPatterns, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkTradingPatterns]);

  const dismiss = () => {
    setDismissed(true);
    setAlert(null);
    // Reset after 5 minutes
    setTimeout(() => setDismissed(false), 5 * 60 * 1000);
  };

  const refresh = () => {
    setDismissed(false);
    checkTradingPatterns();
  };

  return { alert, dismiss, refresh };
};

function getConsecutiveLosses(trades: { pnl: number }[]): number {
  let count = 0;
  for (const t of trades) {
    if (t.pnl < 0) count++;
    else break;
  }
  return count;
}
