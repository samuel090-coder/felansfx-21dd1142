import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, Check, X, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendEmail } from "@/lib/sendEmail";
import { formatCurrency } from "@/lib/currency";

interface Invocation {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  profile?: { full_name: string | null; email: string | null; display_id: string | null };
}

interface InvokeTarget {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

interface Props {
  invokeOpen: boolean;
  setInvokeOpen: (v: boolean) => void;
  invokeTarget: InvokeTarget | null;
}

export const AccessInvocations = ({ invokeOpen, setInvokeOpen, invokeTarget }: Props) => {
  const [list, setList] = useState<Invocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchInvocations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("access_invocations")
      .select("id, user_id, amount, reason, status, paid_at, created_at")
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false });

    const rows = (data || []) as Invocation[];
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, display_id")
        .in("user_id", userIds);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      rows.forEach((r) => (r.profile = map.get(r.user_id)));
    }
    setList(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvocations();
    const ch = supabase
      .channel("access-invocations-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "access_invocations" }, () =>
        fetchInvocations()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchInvocations]);

  useEffect(() => {
    if (invokeOpen) {
      setReason("");
      setAmount("");
      setContext("");
    }
  }, [invokeOpen]);

  const handleGenerateAI = async () => {
    if (!invokeTarget) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-access-reason", {
        body: { context, userName: invokeTarget.full_name || "trader" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReason(data?.reason || "");
      setAmount(String(data?.amount || ""));
      toast.success("AI generated reason & amount");
    } catch (e: any) {
      toast.error(e.message || "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!invokeTarget) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!reason.trim()) {
      toast.error("Provide a reason");
      return;
    }
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("access_invocations").insert({
        user_id: invokeTarget.user_id,
        admin_id: u.user!.id,
        amount: amt,
        reason: reason.trim(),
        status: "pending",
      });
      if (error) throw error;

      if (invokeTarget.email) {
        sendEmail({
          type: "admin_broadcast",
          userEmail: invokeTarget.email,
          userId: invokeTarget.user_id,
          data: {
            name: invokeTarget.full_name || "Trader",
            subject: "Action Required: Access Fee for Your Felans FX Account",
            message: `${reason.trim()}\n\nAmount due: ${formatCurrency(amt, "NGN")}\n\nLog in to your account to complete payment.`,
          },
        });
      }

      toast.success("Access fee invoked — user notified");
      setInvokeOpen(false);
      fetchInvocations();
    } catch (e: any) {
      toast.error(e.message || "Failed to invoke");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (inv: Invocation) => {
    setResolving(inv.id);
    try {
      const { error } = await supabase.rpc("approve_access_invocation", {
        p_invocation_id: inv.id,
        p_notes: null,
      });
      if (error) throw error;
      toast.success("Access granted");
      if (inv.profile?.email) {
        sendEmail({
          type: "admin_broadcast",
          userEmail: inv.profile.email,
          userId: inv.user_id,
          data: {
            name: inv.profile.full_name || "Trader",
            subject: "Your Felans FX Access Has Been Approved",
            message: `Good news — your access fee payment of ${formatCurrency(inv.amount, "NGN")} has been approved. You now have full access to the platform.`,
          },
        });
      }
      fetchInvocations();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    } finally {
      setResolving(null);
    }
  };

  const handleDecline = async (inv: Invocation) => {
    setResolving(inv.id);
    try {
      const { error } = await supabase.rpc("decline_access_invocation", {
        p_invocation_id: inv.id,
        p_notes: null,
      });
      if (error) throw error;
      toast.success(inv.status === "paid" ? "Declined & refunded" : "Declined");
      if (inv.profile?.email) {
        sendEmail({
          type: "admin_broadcast",
          userEmail: inv.profile.email,
          userId: inv.user_id,
          data: {
            name: inv.profile.full_name || "Trader",
            subject: "Update on Your Felans FX Access Request",
            message:
              inv.status === "paid"
                ? `Your access fee payment of ${formatCurrency(inv.amount, "NGN")} has been declined and refunded to your wallet. Please contact support if you have questions.`
                : `The access fee request on your account has been cancelled.`,
          },
        });
      }
      fetchInvocations();
    } catch (e: any) {
      toast.error(e.message || "Failed to decline");
    } finally {
      setResolving(null);
    }
  };

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Access Invocations
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{list.length} active</Badge>
              <Button variant="ghost" size="icon" onClick={fetchInvocations} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              No active invocations. Use "Invoke Paid Access" on a user to require payment.
            </p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {list.map((inv) => (
                <div key={inv.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {inv.profile?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{inv.profile?.email}</p>
                      {inv.profile?.display_id && (
                        <p className="text-xs text-primary">{inv.profile.display_id}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">
                        {formatCurrency(inv.amount, "NGN")}
                      </p>
                      <Badge variant={inv.status === "paid" ? "default" : "outline"} className="mt-1">
                        {inv.status === "paid" ? "Paid ✓" : "Awaiting payment"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground bg-background/60 p-2 rounded">
                    {inv.reason}
                  </p>
                  <div className="flex gap-2">
                    {inv.status === "paid" && (
                      <Button
                        size="sm"
                        className="flex-1 gradient-primary"
                        onClick={() => handleApprove(inv)}
                        disabled={resolving === inv.id}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDecline(inv)}
                      disabled={resolving === inv.id}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      {inv.status === "paid" ? "Decline & Refund" : "Cancel"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoke Dialog */}
      <Dialog open={invokeOpen} onOpenChange={setInvokeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Invoke Paid Access
            </DialogTitle>
            <DialogDescription>
              Require {invokeTarget?.full_name || "this user"} to pay before continuing to use the app.
            </DialogDescription>
          </DialogHeader>

          {invokeTarget && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">{invokeTarget.full_name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{invokeTarget.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Context for AI (optional)</label>
                <Input
                  placeholder="e.g. Suspicious activity, premium feature access..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={handleGenerateAI}
                  disabled={generating}
                >
                  {generating ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5 mr-2" /> Generate Reason & Amount with AI</>
                  )}
                </Button>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Reason (shown to user)</label>
                <Textarea
                  rows={4}
                  placeholder="Explain why this user must pay an access fee..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Amount (NGN)</label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setInvokeOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gradient-primary"
                  onClick={handleSubmit}
                  disabled={submitting || !reason || !amount}
                >
                  {submitting ? "Invoking..." : "Invoke Access Fee"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
