import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Lock, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

interface PaywallGateProps {
  children: React.ReactNode;
}

interface Invocation {
  id: string;
  amount: number;
  reason: string;
  status: string;
}

export const PaywallGate = ({ children }: PaywallGateProps) => {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useAppSettings();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [invocation, setInvocation] = useState<Invocation | null>(null);

  useEffect(() => {
    if (!user || settingsLoading) return;

    // Free mode = everyone has access
    if (settings.app_access_mode !== "paid") {
      setHasAccess(true);
      return;
    }

    // Check admin + unlock status
    const checkAccess = async () => {
      const [adminRes, unlockRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as const }),
        supabase
          .from("user_unlocks")
          .select("id, expires_at")
          .eq("user_id", user.id)
          .eq("unlock_type", "app_access")
          .maybeSingle(),
      ]);

      if (adminRes.data === true) {
        setIsAdmin(true);
        setHasAccess(true);
        return;
      }

      if (unlockRes.data) {
        // Check expiry
        if (!unlockRes.data.expires_at || new Date(unlockRes.data.expires_at) > new Date()) {
          setHasAccess(true);
          return;
        }
      }

      setHasAccess(false);
    };

    checkAccess();
  }, [user, settings.app_access_mode, settingsLoading]);

  const handlePurchase = async () => {
    if (!user || !wallet) return;
    const price = parseFloat(settings.app_access_price) || 5000;

    if (wallet.balance < price) {
      toast.error("Insufficient balance", {
        description: `You need ${formatCurrency(price, "NGN")} but have ${formatCurrency(wallet.balance, "NGN")}`,
      });
      return;
    }

    setPurchasing(true);
    try {
      const { data: deducted, error: deductErr } = await supabase.rpc("deduct_user_wallet", {
        p_user_id: user.id,
        p_amount: price,
      });

      if (deductErr || !deducted) {
        toast.error("Payment failed");
        return;
      }

      const { error: unlockErr } = await supabase.from("user_unlocks").insert({
        user_id: user.id,
        unlock_type: "app_access",
        expires_at: null, // Lifetime access
      });

      if (unlockErr) {
        // Refund
        await supabase.rpc("credit_user_wallet_service", { p_user_id: user.id, p_amount: price });
        toast.error("Failed to unlock access");
        return;
      }

      toast.success("Access unlocked! Welcome to Felans FX 🎉");
      setHasAccess(true);
      refetchWallet();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setPurchasing(false);
    }
  };

  // Not logged in → redirect to auth
  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  // Still loading settings or checking access
  if (settingsLoading || hasAccess === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Has access
  if (hasAccess) return <>{children}</>;

  // Paywall screen
  const price = parseFloat(settings.app_access_price) || 5000;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-0 shadow-xl">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Premium Access Required</h2>
          <p className="text-sm text-muted-foreground">
            This app requires a one-time access fee to unlock all features including trading, analysis, and more.
          </p>
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-2xl font-bold text-primary">{formatCurrency(price, "NGN")}</p>
            <p className="text-xs text-muted-foreground">One-time payment • Lifetime access</p>
          </div>
          <div className="text-xs text-muted-foreground">
            <p>Your balance: {formatCurrency(wallet?.balance || 0, "NGN")}</p>
          </div>
          <Button
            className="w-full gradient-primary font-semibold"
            onClick={handlePurchase}
            disabled={purchasing}
          >
            {purchasing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              <><Shield className="w-4 h-4 mr-2" /> Pay & Unlock Access</>
            )}
          </Button>
          {(wallet?.balance || 0) < price && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = "/deposit"}
            >
              Fund Your Wallet First
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
