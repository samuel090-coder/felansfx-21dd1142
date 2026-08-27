import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Loader2, Clock, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { VirtualAccountCheckout } from "@/components/payments/VirtualAccountCheckout";

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
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [invocation, setInvocation] = useState<Invocation | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const checkAccess = useCallback(async () => {
    if (!user) return;

    const adminRes = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as const });
    if (adminRes.data === true) {
      setHasAccess(true);
      return;
    }

    // Per-user invocation?
    const { data: invs } = await supabase
      .from("access_invocations")
      .select("id, amount, reason, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false })
      .limit(1);
    const inv = invs?.[0] as Invocation | undefined;

    if (inv) {
      setInvocation(inv);
      setHasAccess(false);
      return;
    }
    setInvocation(null);

    if (settings.app_access_mode !== "paid") {
      setHasAccess(true);
      return;
    }

    const { data: unlock } = await supabase
      .from("user_unlocks")
      .select("id, expires_at")
      .eq("user_id", user.id)
      .eq("unlock_type", "app_access")
      .maybeSingle();
    if (unlock && (!unlock.expires_at || new Date(unlock.expires_at) > new Date())) {
      setHasAccess(true);
      return;
    }
    setHasAccess(false);
  }, [user, settings.app_access_mode]);

  useEffect(() => {
    if (!user || settingsLoading) return;
    checkAccess();
  }, [user, settingsLoading, checkAccess]);

  const requiredAmount = invocation?.amount ?? (parseFloat(settings.app_access_price) || 5000);

  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  if (settingsLoading || hasAccess === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasAccess) return <>{children}</>;

  const reasonText = invocation?.reason;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-xl my-6">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">
              {invocation ? "Access Fee Required" : "Premium Access Required"}
            </h2>
            {reasonText && (
              <p className="text-sm text-muted-foreground text-left bg-muted/40 p-3 rounded-lg">
                {reasonText}
              </p>
            )}
            <div className="bg-secondary rounded-xl p-4">
              <p className="text-2xl font-bold text-primary">{formatCurrency(requiredAmount, "NGN")}</p>
              <p className="text-xs text-muted-foreground">Secure card / bank payment • Instant access</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-4 h-4 text-primary" /> Access unlocks as soon as payment is confirmed
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure bank transfer to a dedicated account
            </div>
          </div>

          <Button className="w-full gradient-primary font-semibold h-12" onClick={() => setCheckoutOpen(true)}>
            Pay {formatCurrency(requiredAmount, "NGN", { decimals: 0 })} & Unlock
          </Button>

          <Button variant="outline" className="w-full" onClick={checkAccess}>
            <Clock className="w-4 h-4 mr-2" /> Refresh Status
          </Button>
        </CardContent>
      </Card>

      <VirtualAccountCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        purpose="app_access"
        amount={requiredAmount}
        invocationId={invocation?.id ?? null}
        onSubmitted={() => toast.success("Payment proof submitted — we're confirming it now")}
      />
    </div>
  );
};
