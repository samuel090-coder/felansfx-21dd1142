import { useState } from "react";
import { Mail, Send, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sendEmail, type EmailType } from "@/lib/sendEmail";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const EMAIL_TYPES: { value: EmailType; label: string; group: string }[] = [
  { value: "test_email", label: "Test Email", group: "Test" },
  { value: "account_created", label: "Welcome / Account Created", group: "Account" },
  { value: "login_alert", label: "New Login Alert", group: "Account" },
  { value: "password_changed", label: "Password Changed", group: "Account" },
  { value: "pin_changed", label: "PIN Changed", group: "Account" },
  { value: "kyc_submitted", label: "KYC Submitted", group: "KYC" },
  { value: "kyc_approved", label: "KYC Approved", group: "KYC" },
  { value: "kyc_rejected", label: "KYC Rejected", group: "KYC" },
  { value: "deposit_approved", label: "Deposit Approved", group: "Wallet" },
  { value: "deposit_declined", label: "Deposit Declined", group: "Wallet" },
  { value: "withdrawal_approved", label: "Withdrawal Approved", group: "Wallet" },
  { value: "withdrawal_declined", label: "Withdrawal Declined", group: "Wallet" },
  { value: "wallet_credit", label: "Wallet Credit", group: "Wallet" },
  { value: "wallet_debit", label: "Wallet Debit", group: "Wallet" },
  { value: "payment_approved", label: "Payment Approved", group: "Wallet" },
  { value: "payment_declined", label: "Payment Declined", group: "Wallet" },
  { value: "code_purchased", label: "Access Code Purchased", group: "Wallet" },
  { value: "p2p_received", label: "P2P Received", group: "P2P" },
  { value: "p2p_sent", label: "P2P Sent", group: "P2P" },
  { value: "money_request_received", label: "Money Request Received", group: "P2P" },
  { value: "money_request_accepted", label: "Money Request Accepted", group: "P2P" },
  { value: "money_request_declined", label: "Money Request Declined", group: "P2P" },
  { value: "trade_won", label: "Trade Won", group: "Trading" },
  { value: "trade_lost", label: "Trade Lost", group: "Trading" },
  { value: "losing_streak_alert", label: "Losing Streak Alert", group: "Trading" },
  { value: "signal_published", label: "Signal Published", group: "Signals" },
  { value: "signal_redeemed", label: "Signal Code Redeemed", group: "Signals" },
  { value: "copy_started", label: "Copy Started", group: "Copy Trading" },
  { value: "copy_stopped", label: "Copy Stopped", group: "Copy Trading" },
  { value: "copy_trade_executed", label: "Copy Trade Executed", group: "Copy Trading" },
  { value: "win_pool", label: "Won Pool", group: "Games" },
  { value: "win_game", label: "Won Game", group: "Games" },
  { value: "pool_lost", label: "Pool Lost", group: "Games" },
  { value: "pool_refunded", label: "Pool Refunded", group: "Games" },
  { value: "new_follower", label: "New Follower", group: "Social" },
  { value: "profile_viewed", label: "Profile Viewed", group: "Social" },
  { value: "post_liked", label: "Post Liked", group: "Social" },
  { value: "post_commented", label: "Post Commented", group: "Social" },
  { value: "post_shared", label: "Post Shared", group: "Social" },
  { value: "comment_reply", label: "Comment Reply", group: "Social" },
  { value: "comment_liked", label: "Comment Liked", group: "Social" },
  { value: "mentioned_in_comment", label: "Mentioned in Comment", group: "Social" },
  { value: "milestone_followers", label: "Followers Milestone", group: "Social" },
  { value: "room_invite", label: "Room Invite", group: "Rooms" },
  { value: "room_tagged", label: "Room Tagged", group: "Rooms" },
  { value: "room_join_request", label: "Room Join Request", group: "Rooms" },
  { value: "room_join_approved", label: "Room Join Approved", group: "Rooms" },
  { value: "room_join_declined", label: "Room Join Declined", group: "Rooms" },
  { value: "subscription_activated", label: "Subscription Activated", group: "Subscription" },
  { value: "subscription_expired", label: "Subscription Expired", group: "Subscription" },
  { value: "vip_expiring", label: "VIP Expiring", group: "Subscription" },
  { value: "level_up", label: "Level Up", group: "Gamification" },
  { value: "challenge_completed", label: "Challenge Completed", group: "Gamification" },
  { value: "streak_milestone", label: "Streak Milestone", group: "Gamification" },
  { value: "weekly_summary", label: "Weekly Summary", group: "Reports" },
  { value: "referral_bonus", label: "Referral Bonus", group: "Referrals" },
  { value: "referral_milestone", label: "Referral Milestone", group: "Referrals" },
  { value: "analysis_ready", label: "AI Analysis Ready", group: "AI" },
  { value: "admin_broadcast", label: "Admin Broadcast", group: "Admin" },
  { value: "report_received", label: "Report Received", group: "Admin" },
  { value: "fraud_alert", label: "Fraud Alert", group: "Admin" },
];

const SAMPLE_DATA: Record<string, any> = {
  amount: 50000, payout: 42000, stake: 25000, name: "Sample User",
  reason: "Sample reason", reference: "TXN-123456",
  symbol: "EUR/USD", direction: "BUY", entry: "1.0850", sl: "1.0820", tp: "1.0900",
  level: 5, days: 7, count: 100, plan: "Premium", expires_at: "Dec 31, 2026",
  device: "iPhone 15", location: "Lagos, Nigeria", time: new Date().toLocaleString(),
  pool_name: "Daily Jackpot", game_name: "Coin Flip", code: "ABCD-1234",
  comment: "Great trade! Keep it up.", reply: "Thanks!", note: "Sample note",
  room_name: "Pro Traders", room_id: "1", challenge_name: "Win 5 Trades",
  reward: 5000, win_rate: 65, pnl: 12500, trades: 8,
  summary: "Strong bullish trend detected with confluence at key resistance level.",
  subject: "Important Update", title: "We have news!", message: "Hello traders, we just launched a new feature.",
};

export const EmailTester = () => {
  const { user } = useAuth();
  const [type, setType] = useState<EmailType>("test_email");
  const [recipient, setRecipient] = useState(user?.email || "");
  const [dataJson, setDataJson] = useState(JSON.stringify(SAMPLE_DATA, null, 2));
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState<"send" | "preview" | null>(null);

  const parseData = () => {
    try { return JSON.parse(dataJson || "{}"); } catch { return {}; }
  };

  const handlePreview = async () => {
    if (!recipient) return toast.error("Enter a recipient email");
    setLoading("preview");
    const res = await sendEmail({
      type, userEmail: recipient, data: parseData(),
      userId: user?.id, previewOnly: true,
    });
    setLoading(null);
    if (res.success && res.html) {
      setPreviewHtml(res.html);
    } else {
      toast.error(res.error || "Preview failed");
    }
  };

  const handleSend = async () => {
    if (!recipient) return toast.error("Enter a recipient email");
    setLoading("send");
    const res = await sendEmail({
      type, userEmail: recipient, data: parseData(), userId: user?.id,
    });
    setLoading(null);
    if (res.success) toast.success(`Email sent to ${recipient}`);
    else toast.error(res.error || "Send failed");
  };

  const grouped = EMAIL_TYPES.reduce((acc, t) => {
    (acc[t.group] ||= []).push(t);
    return acc;
  }, {} as Record<string, typeof EMAIL_TYPES>);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Send any branded email template to a test address. Use Preview to see the HTML before sending.
        </p>

        <div className="space-y-2">
          <Label>Email Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as EmailType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{group}</div>
                  {items.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Recipient Email</Label>
          <Input
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label>Sample Data (JSON)</Label>
          <Textarea
            value={dataJson}
            onChange={(e) => setDataJson(e.target.value)}
            rows={8}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Edit values to customize the email. Unused fields are ignored.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handlePreview} variant="outline" className="flex-1" disabled={loading !== null}>
            {loading === "preview" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            Preview
          </Button>
          <Button onClick={handleSend} className="flex-1" disabled={loading !== null}>
            {loading === "send" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send Test
          </Button>
        </div>

        {previewHtml && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>Preview</Label>
              <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)}>Close</Button>
            </div>
            <div className="rounded-lg border overflow-hidden bg-white">
              <iframe
                srcDoc={previewHtml}
                title="Email preview"
                className="w-full h-[600px] border-0"
                sandbox=""
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
