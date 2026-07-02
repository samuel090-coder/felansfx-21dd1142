import { Seo } from "@/components/Seo";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Eye, Headphones, MoreHorizontal, ShieldCheck, Wallet2, ArrowDownToLine, ArrowUpRight, BrainCircuit, CandlestickChart, Newspaper, GraduationCap, Sparkles, ChartNoAxesCombined } from "lucide-react";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useAppSettings } from "@/hooks/useAppSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useCurrencyPreference } from "@/hooks/useCurrencyPreference";
import { useNotifications } from "@/hooks/useNotifications";
import { AppLayout } from "@/components/layout/AppLayout";
import { MainMenuDrawer } from "@/components/layout/MainMenuDrawer";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { FintechCard } from "@/components/ui/fintech";

const marketRows = [
  { asset: "BTC/USDT", price: "$105,420", change: "+1.80%", tone: "success" },
  { asset: "ETH/USDT", price: "$5,980", change: "+2.40%", tone: "success" },
  { asset: "NGX ASI", price: "105,398.50", change: "+0.70%", tone: "success" },
  { asset: "SOL/USDT", price: "$163.20", change: "+1.25%", tone: "success" },
] as const;

const tools = [
  { icon: CandlestickChart, title: "TradingView Charts", subtitle: "Advanced charts & indicators", to: "/trading" },
  { icon: BrainCircuit, title: "AI Trading Guide", subtitle: "Learn how AI predictions work", to: "/help" },
  { icon: GraduationCap, title: "Learning Hub", subtitle: "Courses for all levels", to: "/school" },
  { icon: Newspaper, title: "Market News", subtitle: "Stay updated daily", to: "/daily-streak" },
] as const;

const activity = [
  { title: "Deposit received", meta: "₦50,000.00 • 2h ago", amount: "+₦50,000.00", tone: "success" },
  { title: "Bought BTC", meta: "₦25,000.00 • 5h ago", amount: "-₦25,000.00", tone: "danger" },
  { title: "2FA enabled", meta: "Security event • Yesterday", amount: "", tone: "neutral" },
  { title: "Account verified", meta: "May 17, 2024", amount: "", tone: "neutral" },
] as const;

const sparkPath = "M10 110 C40 108, 52 94, 82 101 S122 109, 144 97 S175 88, 196 92 S222 75, 250 63 S288 74, 326 66";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, loading: walletLoading } = useWallet();
  const { settings } = useAppSettings();
  const { requestPermission, permission } = usePushNotifications();
  const { unreadCount } = useNotifications();
  const { format } = useCurrencyPreference();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [qualifiedTier, setQualifiedTier] = useState<null | { key: string; label: string; min: number }>(null);
  const [displayId, setDisplayId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !wallet) return;
    const tiers = [
      { key: "1m", label: "₦1,000,000 Tier", min: 1000000 },
      { key: "500k", label: "₦500,000 Tier", min: 500000 },
      { key: "200k", label: "₦200,000 Tier", min: 200000 },
      { key: "50k", label: "₦50,000 Tier", min: 50000 },
    ];
    const eligible = tiers.find((t) => (wallet.balance || 0) >= t.min);
    if (!eligible) return;
    const seenKey = `wc_popup_${user.id}_${eligible.key}`;
    if (localStorage.getItem(seenKey)) return;
    setQualifiedTier(eligible);
    localStorage.setItem(seenKey, "1");
  }, [user, wallet]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      const key = `onboarding_done_${user.id}`;
      if (!localStorage.getItem(key)) {
        setShowOnboarding(true);
      }
      supabase
        .from("profiles")
        .select("display_id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => setDisplayId(data?.display_id || null));
    }
  }, [user]);

  useEffect(() => {
    if (user && permission === "default") {
      const timer = setTimeout(() => {
        requestPermission();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, permission, requestPermission]);

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_done_${user.id}`, "true");
    }
    setShowOnboarding(false);
  };

  if (authLoading || walletLoading) return <LoadingScreen />;
  if (!user) return null;

  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Trader";
  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((item) => item[0])
    .join("")
    .toUpperCase();
  const balance = wallet?.balance || 0;
  const buyingPower = balance;
  const usdApprox = balance * 0.00063;
  const delta = Math.max(12480, Math.round(balance * 0.0116));
  const updateTime = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <AppLayout>
      <Seo
        title="Felans FX — Premium Trading Dashboard"
        description="Monitor your wallet, market overview, AI insights and live trading tools from the Felans FX premium dashboard."
        path="/"
      />
      {showOnboarding && <OnboardingTour onComplete={handleOnboardingComplete} />}

      <Dialog open={!!qualifiedTier} onOpenChange={(o) => !o && setQualifiedTier(null)}>
        <DialogContent className="fx-card border-primary/20 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>You qualify for {qualifiedTier?.label}!</DialogTitle>
            <DialogDescription>
              Complete the withdrawal challenge to unlock your withdrawals at this tier.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="gradient-primary w-full font-bold" onClick={() => { setQualifiedTier(null); navigate("/withdrawal-challenge"); }}>
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-fx-app">
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-5 safe-area-top">
          <header className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/50 bg-[linear-gradient(180deg,rgba(32,214,199,0.18),rgba(33,106,255,0.18))] text-base font-bold text-white shadow-[0_0_0_4px_rgba(255,255,255,0.03)]">
                  {initials}
                </div>
                <span className="absolute bottom-0.5 right-0 h-3 w-3 rounded-full border-2 border-background bg-success" />
              </div>
              <div>
                <p className="text-xs text-white/70">Good evening,</p>
                <h1 className="text-lg font-extrabold leading-tight text-white">{userName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(45,123,255,0.28)] px-2 py-0.5 text-white">
                    <ShieldCheck className="h-3 w-3 text-primary" /> Verified
                  </span>
                  <span className="text-white/55">Updated {updateTime}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/notifications")} className="relative h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Headphones className="h-5 w-5" />
              </Button>
            </div>
          </header>

          <section className="fx-card-strong mb-4 overflow-hidden p-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-white/84">
                  <p className="text-xs">Total portfolio value</p>
                  <Eye className="h-3.5 w-3.5" />
                </div>
                <p className="text-3xl font-extrabold leading-none tracking-tight text-white">{formatCurrency(balance, "NGN")}</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-sm font-semibold text-success">+{formatCurrency(delta, "NGN")} (+1.16%)</p>
                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/78">Today</span>
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                <ShieldCheck className="h-8 w-8 text-white/70" strokeWidth={1.8} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div>
                <p className="text-[11px] text-white/66">Available cash</p>
                <p className="mt-0.5 text-lg font-bold text-white">{formatCurrency(balance, "NGN")}</p>
              </div>
              <div>
                <p className="text-[11px] text-white/66">Buying power</p>
                <p className="mt-0.5 text-lg font-bold text-white">{formatCurrency(buyingPower, "NGN")}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                { icon: Wallet2, label: "Deposit", onClick: () => navigate("/deposit") },
                { icon: ArrowDownToLine, label: "Withdraw", onClick: () => navigate("/withdraw") },
                { icon: ArrowUpRight, label: "Transfer", onClick: () => navigate("/send-funds") },
                { icon: MoreHorizontal, label: "More", onClick: () => navigate("/profile") },
              ].map(({ icon: Icon, label, onClick }) => (
                <button key={label} onClick={onClick} className="rounded-2xl border border-white/12 bg-white/5 px-2 py-3 text-center text-white transition hover:bg-white/10">
                  <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-medium">{label}</p>
                </button>
              ))}
            </div>
          </section>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <FintechCard className="relative overflow-hidden p-4">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(5,39,89,0.88),rgba(10,54,137,0.76))]" />
              <div className="relative z-10">
                <div className="mb-1.5 flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Live Trade</h2>
                  <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-medium text-success">Live</span>
                </div>
                <p className="text-xs leading-snug text-white/76">Access TradingView real-time charts, indicators and advanced tools.</p>
                <Button onClick={() => navigate("/trading")} className="mt-3 h-9 rounded-xl border border-white/15 bg-white/6 px-3 text-xs text-white hover:bg-white/12">
                  Open TradingView <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </FintechCard>

            <FintechCard className="relative overflow-hidden p-4">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(66,43,144,0.76),rgba(103,62,205,0.62))]" />
              <div className="relative z-10">
                <div className="mb-1.5 flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">AI Trading</h2>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/90">New</span>
                </div>
                <p className="text-xs leading-snug text-white/76">Upload an image and AI predicts possible outcomes.</p>
                <Button onClick={() => navigate("/analyze")} className="mt-3 h-9 rounded-xl border border-white/15 bg-white/6 px-3 text-xs text-white hover:bg-white/12">
                  Try AI Prediction <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </FintechCard>
          </div>

          <FintechCard className="mb-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <ChartNoAxesCombined className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold">Market overview</h2>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-[11px] text-white/72">
                {['1D', '1W', '1M', '1Y', 'All'].map((item, idx) => (
                  <button key={item} className={cn('rounded-lg px-2 py-1', idx === 0 && 'gradient-primary text-white')}>{item}</button>
                ))}
              </div>
            </div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[11px] text-white/62">30D return</p>
                <p className="text-2xl font-bold text-success">+6.40%</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-white/62">Net deposits</p>
                <p className="text-lg font-bold text-white">₦150,000.00</p>
              </div>
            </div>
            <svg viewBox="0 0 340 120" className="h-20 w-full">
              <path d={sparkPath} fill="none" stroke="hsl(var(--accent))" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </FintechCard>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <FintechCard className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Watchlist</h3>
                <button className="text-[11px] text-white/55">View all</button>
              </div>
              <div className="space-y-2.5">
                {marketRows.map((row) => (
                  <div key={row.asset} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-white">{row.asset}</p>
                      <p className="truncate text-[10px] text-white/60">{row.price}</p>
                    </div>
                    <p className="shrink-0 text-[11px] font-semibold text-success">{row.change}</p>
                  </div>
                ))}
              </div>
            </FintechCard>

            <FintechCard className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Recent activity</h3>
                <button className="text-[11px] text-white/55">View all</button>
              </div>
              <div className="space-y-2.5">
                {activity.map((item) => (
                  <div key={item.title} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-white">{item.title}</p>
                      <p className="truncate text-[10px] text-white/55">{item.meta}</p>
                    </div>
                    {item.amount ? <p className={cn('shrink-0 text-[10px] font-semibold', item.tone === 'success' ? 'text-success' : 'text-destructive')}>{item.amount}</p> : <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/36" />}
                  </div>
                ))}
              </div>
            </FintechCard>
          </div>

          <FintechCard className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Tools & education</h3>
              <span className="text-[11px] text-white/45">{displayId || 'FX188380'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tools.map(({ icon: Icon, title, subtitle, to }) => (
                <button key={title} onClick={() => navigate(to)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.08]">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-white">{title}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/56">{subtitle}</p>
                </button>
              ))}
            </div>
          </FintechCard>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
            <div>
              <p className="text-[11px] text-white/60">Display currency</p>
              <p className="text-sm font-semibold">{format(balance)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">{unreadCount}</span> : null}
              <MainMenuDrawer />
            </div>
          </div>

          <p className="mt-4 text-center text-[10px] text-white/40">
            Analysis cost: {formatCurrency(parseFloat(settings.analysis_cost) / 0.00063, "NGN")} per analysis.
          </p>
          <p className="mt-1 text-center text-[10px] text-white/34">≈ {formatCurrency(usdApprox, 'USD')} equivalent shown for quick context</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
