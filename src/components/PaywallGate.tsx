import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Lock, Loader2, Clock, Upload, Copy, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface DepositMethod {
  id: string;
  name: string;
  details: string;
}

interface PendingPayment {
  id: string;
  amount: number;
  status: string;
}

export const PaywallGate = ({ children }: PaywallGateProps) => {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useAppSettings();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [invocation, setInvocation] = useState<Invocation | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [uploading, setUploading] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const checkAccess = useCallback(async () => {
    if (!user) return;

    const adminRes = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as const });
    if (adminRes.data === true) {
      setHasAccess(true);
      return;
    }

    // Pending bank-transfer payment for app_access?
    const { data: pays } = await supabase
      .from("access_payments")
      .select("id, amount, status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);
    const pending = pays?.[0] as PendingPayment | undefined;

    // Per-user invocation?
    const { data: invs } = await supabase
      .from("access_invocations")
      .select("id, amount, reason, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false })
      .limit(1);
    const inv = invs?.[0] as Invocation | undefined;

    if (pending) {
      setPendingPayment(pending);
      setInvocation(inv || null);
      setHasAccess(false);
      return;
    }
    setPendingPayment(null);

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
    supabase.from("deposit_methods").select("id, name, details").eq("is_active", true).then(({ data }) => {
      setMethods((data as DepositMethod[]) || []);
    });
  }, [user, settingsLoading, checkAccess]);

  const requiredAmount = invocation?.amount ?? (parseFloat(settings.app_access_price) || 5000);

  const handleSubmitPayment = async () => {
    if (!user || !screenshot) {
      toast.error("Please upload your payment screenshot");
      return;
    }
    setUploading(true);
    try {
      const ext = screenshot.name.split(".").pop() || "jpg";
      const path = `access-payments/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, screenshot, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);

      const { error: insErr } = await supabase.from("access_payments").insert({
        user_id: user.id,
        invocation_id: invocation?.id || null,
        amount: requiredAmount,
        screenshot_url: urlData.publicUrl,
        status: "pending",
      });
      if (insErr) throw insErr;

      toast.success("Payment submitted — awaiting admin review");
      setScreenshot(null);
      setShowUploadForm(false);
      await checkAccess();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

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

  // Awaiting admin review
  if (pendingPayment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 shadow-xl">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Payment Under Review</h2>
            <p className="text-sm text-muted-foreground">
              We received your proof of payment for {formatCurrency(pendingPayment.amount, "NGN")}. An admin
              will verify and unlock your access shortly.
            </p>
            <Button variant="outline" className="w-full" onClick={checkAccess}>
              Refresh Status
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Either per-user invocation OR global paid mode → show bank-transfer screen
  const reasonText = invocation?.reason;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-xl my-6">
        <CardContent className="p-6 space-y-4">
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
              <p className="text-xs text-muted-foreground">
                Pay via bank transfer • Admin approval required
              </p>
            </div>
          </div>

          {!showUploadForm ? (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> Send to one of these accounts:
                </p>
                {methods.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No bank accounts configured. Contact admin.</p>
                ) : (
                  methods.map((m) => (
                    <div key={m.id} className="border rounded-lg p-3 text-sm bg-card">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{m.name}</span>
                        <Button size="sm" variant="ghost" onClick={() => copy(m.details)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{m.details}</p>
                    </div>
                  ))
                )}
              </div>
              <Button
                className="w-full gradient-primary font-semibold"
                onClick={() => setShowUploadForm(true)}
              >
                <Upload className="w-4 h-4 mr-2" /> I've Paid — Upload Proof
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="ss">Payment Screenshot</Label>
              <Input
                id="ss"
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Upload a clear screenshot showing the amount of {formatCurrency(requiredAmount, "NGN")} and
                the recipient account.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowUploadForm(false)}>
                  Back
                </Button>
                <Button
                  className="flex-1 gradient-primary"
                  onClick={handleSubmitPayment}
                  disabled={uploading || !screenshot}
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                  ) : (
                    <><Shield className="w-4 h-4 mr-2" /> Submit</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
