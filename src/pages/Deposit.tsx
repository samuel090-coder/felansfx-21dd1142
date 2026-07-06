import { Seo } from "@/components/Seo";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Eye,
  ShieldCheck,
  Wallet,
  ArrowRight,
  HelpCircle,
  Lock,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useAppSettings } from "@/hooks/useAppSettings";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatCurrency, formatWithConversion } from "@/lib/currency";
import { FintechCard } from "@/components/ui/fintech";
import { cn } from "@/lib/utils";
import { startPaystackPayment } from "@/lib/paystack";

interface Deposit {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  admin_notes: string | null;
}

const quickAmounts = [1000, 5000, 10000, 50000, 100000];

const Deposit = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const { settings } = useAppSettings();

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const fetchDeposits = async () => {
    if (!user) return;
    const { data: userDeposits } = await supabase
      .from("deposits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setDeposits((userDeposits || []) as Deposit[]);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        await fetchDeposits();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refetchWallet();
      fetchDeposits();
    }, 30000);
    return () => clearInterval(interval);
  }, [user, refetchWallet]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount) {
      toast.error("Please enter an amount");
      return;
    }

    const amountNum = parseFloat(amount);
    const minDepositNGN = parseFloat(settings.min_deposit);
    const maxDepositNGN = parseFloat(settings.max_deposit);

    if (isNaN(amountNum) || amountNum < minDepositNGN || amountNum > maxDepositNGN) {
      toast.error(
        `Amount must be between ${formatCurrency(minDepositNGN, "NGN", { decimals: 0 })} and ${formatCurrency(maxDepositNGN, "NGN", { decimals: 0 })}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await startPaystackPayment({ purpose: "deposit", amount: amountNum });
      if (result.status === "success") {
        toast.success("Payment successful — your wallet has been credited!");
        setAmount("");
        await refetchWallet();
        await fetchDeposits();
      } else if (result.status === "pending") {
        toast.info("Payment received — your wallet will update shortly.");
        setAmount("");
        setTimeout(() => { refetchWallet(); fetchDeposits(); }, 4000);
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (authLoading || loading) return <LoadingScreen />;
  if (!user) return null;

  return (
    <AppLayout>
      <Seo title="Deposit Funds — Felans FX" description="Fund your Felans FX wallet instantly with secure card payments." path="/deposit" />
      <div className="bg-fx-app">
        <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-5 safe-area-top">
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-bold text-white">Deposit Funds</h1>
            </div>
            <button className="flex items-center gap-1.5 text-white/55">
              <HelpCircle className="h-4 w-4" />
              <span className="text-xs">How it works</span>
            </button>
          </header>

          {/* Balance card */}
          <FintechCard className="relative mb-4 overflow-hidden p-4">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(26,178,155,0.35),rgba(15,74,138,0.38))]" />
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2 text-white/72">
                  <p className="text-xs">Current Balance</p>
                  <Eye className="h-3.5 w-3.5" />
                </div>
                <p className="truncate text-2xl font-extrabold text-white">{formatCurrency(wallet?.balance || 0, "NGN")}</p>
                <p className="mt-1 truncate text-sm text-white/80">≈ {formatWithConversion(wallet?.balance || 0).usd}</p>
                <p className="mt-2 text-[11px] text-white/55">All deposits are in Nigerian Naira (NGN)</p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                <Wallet className="h-7 w-7 text-primary" />
              </div>
            </div>
          </FintechCard>

          {/* New deposit */}
          <FintechCard className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">New Deposit</h2>
              <div className="flex items-center gap-1.5 text-primary">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[11px]">Secure & Encrypted</span>
              </div>
            </div>

            <form onSubmit={handlePay} className="space-y-5">
              <div>
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>
                  <p className="text-sm font-semibold text-white">Enter Amount</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="flex items-center gap-2 text-white">
                    <span className="text-2xl text-white/45">₦</span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="10,000"
                      className="h-auto border-0 bg-transparent px-0 py-0 text-2xl font-semibold text-white placeholder:text-white/25 focus-visible:ring-0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      step="100"
                    />
                    {amount ? (
                      <button type="button" onClick={() => setAmount("")} className="rounded-full bg-white/8 p-1.5 text-white/45">
                        <XCircle className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-5 gap-1.5">
                  {quickAmounts.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmount(String(value))}
                      className={cn(
                        "rounded-xl border px-1 py-2 text-[11px] font-medium",
                        Number(amount) === value ? "border-primary bg-primary/10 text-primary" : "border-white/10 bg-white/[0.03] text-white/55"
                      )}
                    >
                      {value >= 1000 ? `${value / 1000}k` : value}
                    </button>
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] text-white/52">
                  Min: {formatCurrency(parseFloat(settings.min_deposit), "NGN", { decimals: 0 })}
                  <span className="mx-1.5">|</span>
                  Max: {formatCurrency(parseFloat(settings.max_deposit), "NGN", { decimals: 0 })}
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>
                  <p className="text-sm font-semibold text-white">Pay Securely</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Instant Card / Bank Payment</p>
                    <p className="text-[11px] text-white/55">Your wallet is credited automatically after payment.</p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-2xl gradient-primary text-sm font-bold shadow-primary"
                disabled={isSubmitting || !amount}
              >
                {isSubmitting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    Pay {amount ? formatCurrency(parseFloat(amount) || 0, "NGN", { decimals: 0 }) : "Now"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-white/38">
                <Lock className="h-3.5 w-3.5" />
                <p className="text-[11px]">Payments are encrypted. We never store your card details.</p>
              </div>
            </form>
          </FintechCard>

          {/* History */}
          <FintechCard className="mt-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Deposit History</h3>
              <span className="text-[11px] text-white/45">Status tracking</span>
            </div>
            {deposits.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/45">No deposits yet</p>
            ) : (
              <div className="space-y-2.5">
                {deposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/6">{getStatusIcon(deposit.status)}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{formatCurrency(deposit.amount, "NGN")}</p>
                        <p className="truncate text-[11px] text-white/45">{new Date(deposit.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] capitalize",
                        deposit.status === "approved"
                          ? "bg-success/15 text-success"
                          : deposit.status === "rejected"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-warning/15 text-warning"
                      )}
                    >
                      {deposit.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </FintechCard>
        </div>
      </div>
    </AppLayout>
  );
};

export default Deposit;
