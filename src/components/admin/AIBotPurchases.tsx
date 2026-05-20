import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ExternalLink, Inbox, Bot } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { sendEmail } from "@/lib/sendEmail";

interface BotPurchase {
  id: string;
  user_id: string;
  plan_key: string;
  amount: number;
  screenshot_url: string;
  status: string;
  created_at: string;
  profile?: { full_name: string | null; email: string | null; display_id: string | null } | null;
}

export const AIBotPurchases = () => {
  const [items, setItems] = useState<BotPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ai_bot_purchases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const list = (data || []) as BotPurchase[];
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
      .channel("ai-bot-purchases-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_bot_purchases" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const planLabel = (k: string) => k === "6month" ? "6 Months" : k === "lifetime" ? "Lifetime" : k;

  const handleApprove = async (item: BotPurchase) => {
    setBusy(item.id);
    const { error } = await supabase.rpc("approve_ai_bot_purchase", { p_purchase_id: item.id });
    if (error) toast.error(error.message);
    else {
      toast.success("AI Bot purchase approved");
      if (item.profile?.email) {
        sendEmail({
          type: "admin_broadcast",
          userEmail: item.profile.email,
          userId: item.user_id,
          data: {
            subject: `🤖 AI Trading Bot Activated — ${planLabel(item.plan_key)}`,
            body: `Hi ${item.profile.full_name || "there"},\n\nYour ${planLabel(item.plan_key)} AI Trading Bot purchase of ${formatCurrency(item.amount, "NGN")} has been approved and is now active on your account.\n\nOpen the Trading room and tap the AI Bot button to start receiving signals.\n\nThank you for your business.`,
          },
        });
      }
      load();
    }
    setBusy(null);
  };

  const handleDecline = async (item: BotPurchase) => {
    const notes = prompt("Reason for declining (optional):") || "";
    setBusy(item.id);
    const { error } = await supabase.rpc("decline_ai_bot_purchase", {
      p_purchase_id: item.id, p_notes: notes || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Purchase declined");
      if (item.profile?.email) {
        sendEmail({
          type: "admin_broadcast",
          userEmail: item.profile.email,
          userId: item.user_id,
          data: {
            subject: `❌ AI Bot Purchase Declined — ${planLabel(item.plan_key)}`,
            body: `Hi ${item.profile.full_name || "there"},\n\nWe couldn't verify your payment of ${formatCurrency(item.amount, "NGN")} for the ${planLabel(item.plan_key)} AI Trading Bot.\n\n${notes ? `Reason: ${notes}\n\n` : ""}Please re-submit a clear screenshot or contact support if you believe this is an error.`,
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
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" /> AI Bot Purchases (Bank Transfer)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No purchases yet
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
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{planLabel(it.plan_key)}</Badge>
                      <p className="text-sm font-bold text-primary">{formatCurrency(it.amount, "NGN")}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{new Date(it.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant={it.status === "approved" ? "default" : it.status === "declined" ? "destructive" : "secondary"}>
                    {it.status}
                  </Badge>
                </div>
                <a href={it.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="w-3 h-3" /> View screenshot
                </a>
                {it.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => handleApprove(it)} disabled={busy === it.id}>
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleDecline(it)} disabled={busy === it.id}>
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
