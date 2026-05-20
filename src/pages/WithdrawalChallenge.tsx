import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Trophy, Clock, ShieldCheck, AlertTriangle, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

interface Challenge {
  id: string;
  tier: string;
  required_volume: number;
  duration_minutes: number;
  deadline: string;
  volume_traded: number;
  losses_count: number;
  no_loss_required: boolean;
  status: string;
  started_at: string;
}

const TIERS = [
  { key: "50k", min: 50000, required: 10000, hours: 2, label: "₦50,000 Tier", noLoss: false, tradeAmount: 2000, tradeDuration: 60 },
  { key: "200k", min: 200000, required: 100000, hours: 5, label: "₦200,000 Tier", noLoss: false, tradeAmount: 10000, tradeDuration: 60 },
  { key: "500k", min: 500000, required: 400000, hours: 7, label: "₦500,000 Tier", noLoss: false, tradeAmount: 25000, tradeDuration: 60 },
  { key: "1m", min: 1000000, required: 0, hours: 0.5, label: "₦1,000,000 Tier", noLoss: true, tradeAmount: 50000, tradeDuration: 30 },
];


const fmtCountdown = (ms: number) => {
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const WithdrawalChallenge = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, loading: walletLoading } = useWallet();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("withdrawal_challenges")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(1);
    setChallenge((data?.[0] as Challenge) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Realtime updates as trades close
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("wc-self")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_challenges", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const balance = wallet?.balance || 0;
  const eligibleTier = [...TIERS].reverse().find((t) => balance >= t.min);

  const startChallenge = async (tierKey: string) => {
    setStarting(true);
    const { error } = await supabase.rpc("start_withdrawal_challenge", { p_tier: tierKey });
    if (error) {
      toast.error(error.message);
      setStarting(false);
      return;
    }
    toast.success("Challenge started — opening trading room");
    const tier = TIERS.find((t) => t.key === tierKey);
    const params = new URLSearchParams({
      amount: String(tier?.tradeAmount || 1000),
      duration: String(tier?.tradeDuration || 60),
      account: "real",
      from: "challenge",
    });
    navigate(`/trading?${params.toString()}`);
    setStarting(false);
  };


  if (loading || walletLoading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const activeChallenge = challenge && challenge.status === "active" ? challenge : null;
  const deadlineMs = activeChallenge ? new Date(activeChallenge.deadline).getTime() : 0;
  const remaining = deadlineMs - now;
  const progressPct = activeChallenge
    ? Math.min(100, (Number(activeChallenge.volume_traded) / Number(activeChallenge.required_volume)) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 pb-28 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Withdrawal Challenge</h1>
        </div>

        <Alert>
          <ShieldCheck className="w-4 h-4" />
          <AlertDescription className="text-xs leading-relaxed">
            To protect the platform and build disciplined traders, withdrawals of large balances must first
            complete a trading challenge. This trains risk management, reduces system abuse, and makes
            earnings more realistic and sustainable.
          </AlertDescription>
        </Alert>

        {/* ACTIVE CHALLENGE */}
        {activeChallenge && (
          <Card className="border-primary/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" /> Active Challenge
                </CardTitle>
                <Badge>{TIERS.find((t) => t.key === activeChallenge.tier)?.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Volume traded</span>
                  <span className="font-semibold">
                    {formatCurrency(Number(activeChallenge.volume_traded), "NGN")} /{" "}
                    {formatCurrency(Number(activeChallenge.required_volume), "NGN")}
                  </span>
                </div>
                <Progress value={progressPct} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Time left
                  </p>
                  <p className="font-mono font-bold text-primary">{fmtCountdown(remaining)}</p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">Losses</p>
                  <p className="font-bold">{activeChallenge.losses_count}</p>
                </div>
              </div>
              {activeChallenge.no_loss_required && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    No losing trades allowed in this tier — a single loss fails the challenge.
                  </AlertDescription>
                </Alert>
              )}
              <Button className="w-full gradient-primary" onClick={() => {
                const tier = TIERS.find((t) => t.key === activeChallenge.tier);
                const params = new URLSearchParams({
                  amount: String(tier?.tradeAmount || 1000),
                  duration: String(tier?.tradeDuration || 60),
                  account: "real",
                  from: "challenge",
                });
                navigate(`/trading?${params.toString()}`);
              }}>
                <TrendingUp className="w-4 h-4 mr-2" /> Go Trade
              </Button>

            </CardContent>
          </Card>
        )}

        {/* RESULT */}
        {challenge && challenge.status !== "active" && (
          <Card>
            <CardContent className="p-4 space-y-2 text-center">
              <Badge
                variant={challenge.status === "passed" ? "default" : "destructive"}
                className="mx-auto"
              >
                {challenge.status.toUpperCase()}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {challenge.status === "passed"
                  ? "🎉 You passed — you can now request a withdrawal."
                  : "Challenge ended. You can try again."}
              </p>
              {challenge.status === "passed" && (
                <Button className="w-full" onClick={() => navigate("/withdraw")}>
                  Withdraw Now
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* PICK A TIER */}
        {!activeChallenge && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Challenges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {TIERS.map((t) => {
                const eligible = balance >= t.min;
                const required = t.key === "1m" ? balance : t.required;
                return (
                  <div key={t.key} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{t.label}</span>
                      <Badge variant={eligible ? "default" : "secondary"}>
                        {eligible ? "Eligible" : "Locked"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Trade {formatCurrency(required, "NGN")} within {t.hours < 1 ? "30 minutes" : `${t.hours} hours`}.
                      {t.noLoss && " No losses allowed."}
                    </p>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!eligible || starting}
                      onClick={() => startChallenge(t.key)}
                    >
                      {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Challenge"}
                    </Button>
                  </div>
                );
              })}
              {!eligibleTier && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Reach ₦50,000 in your real wallet to unlock the first tier.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default WithdrawalChallenge;
