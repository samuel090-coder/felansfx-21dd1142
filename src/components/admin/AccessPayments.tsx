import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ExternalLink, Inbox } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { sendEmail } from "@/lib/sendEmail";

interface AccessPayment {
  id: string;
  user_id: string;
  amount: number;
  screenshot_url: string;
  status: string;
  created_at: string;
  invocation_id: string | null;
  profile?: { full_name: string | null; email: string | null; display_id: string | null } | null;
}

export const AccessPayments = () => {
  const [items, setItems] = useState<AccessPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("access_payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const list = (data || []) as AccessPayment[];
    if (list.length) {
      const ids = Array.from(new Set(list.map((i) => i.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, display_id")
        .in("user_id", ids);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      list.forEach((it) => (it.profile = map.get(it.user_id) || null));
    }
    setItems(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("access-payments-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "access_payments" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleApprove = async (item: AccessPayment) => {
    setBusy(item.id);
    const { error } = await supabase.rpc("approve_access_payment", { p_payment_id: item.id });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Access approved");
      if (item.profile?.email) {
        sendEmail({
          type: "admin_broadcast",
          userEmail: item.profile.email,
          userId: item.user_id,
          data: {
            subject: "✅ Your Access Payment Was Approved",
            body: `Hi ${item.profile.full_name || "there"},\n\nYour payment of ${formatCurrency(item.amount, "NGN")} has been verified. Premium access is now active on your account.\n\nThank you for your patience.`,
          },
        });
      }
      load();
    }
    setBusy(null);
  };

  const handleDecline = async (item: AccessPayment) => {
    const notes = prompt("Reason for declining (optional):") || "";
    setBusy(item.id);
    const { error } = await supabase.rpc("decline_access_payment", {
      p_payment_id: item.id,
      p_notes: notes || null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Payment declined");
      if (item.profile?.email) {
        sendEmail({
          type: "admin_broadcast",
          userEmail: item.profile.email,
          userId: item.user_id,
          data: {
            subject: "❌ Your Access Payment Was Declined",
            body: `Hi ${item.profile.full_name || "there"},\n\nWe were unable to verify your payment of ${formatCurrency(item.amount, "NGN")}.\n\n${notes ? `Reason: ${notes}\n\n` : ""}Please re-upload a clear screenshot or contact support if you believe this is an error.`,
          },
        });
      }
      load();
    }
    setBusy(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Access Payments (Bank Transfer)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No payments yet
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {it.profile?.full_name || "Unknown"}{" "}
                      <span className="text-xs text-muted-foreground">({it.profile?.display_id})</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{it.profile?.email}</p>
                    <p className="text-sm font-bold text-primary mt-1">
                      {formatCurrency(it.amount, "NGN")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(it.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={it.status === "approved" ? "default" : it.status === "declined" ? "destructive" : "secondary"}
                  >
                    {it.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={it.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> View screenshot
                  </a>
                </div>
                {it.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApprove(it)}
                      disabled={busy === it.id}
                    >
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDecline(it)}
                      disabled={busy === it.id}
                    >
                      <X className="w-3 h-3 mr-1" /> Decline
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
