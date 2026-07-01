import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarDays, ChevronRight, Copy, CreditCard, FileText, Globe, HelpCircle, Lock, LogOut, Moon, Shield, ShieldCheck, Smartphone, Sun, User, Wallet, Monitor, BadgeCheck, Settings, ArrowRight, Users, BookOpen, Landmark } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTheme } from "@/hooks/useTheme";
import { useCurrencyPreference } from "@/hooks/useCurrencyPreference";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FintechCard } from "@/components/ui/fintech";

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { wallet, loading: walletLoading } = useWallet();
  const { isSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency, format, availableCurrencies } = useCurrencyPreference();
  const [savedCount, setSavedCount] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [displayId, setDisplayId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [kycData, setKycData] = useState<{ full_name?: string | null; date_of_birth?: string | null; id_number?: string | null } | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      const [{ count }, { count: tradeCount }, { data: profile }, { data: kyc }, { count: unreadCount }] = await Promise.all([
        supabase.from("analyses").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_saved", true),
        supabase.from("demo_trade_history").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("display_id, avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("kyc_verifications").select("status, full_name, date_of_birth, id_number, selfie_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
      ]);

      setSavedCount(count || 0);
      setTotalTrades(tradeCount || 0);
      setDisplayId(profile?.display_id || null);
      setAvatarUrl(profile?.avatar_url || null);
      setUnreadNotifications(unreadCount || 0);
      setKycStatus(kyc?.status || null);
      if (kyc?.status === "approved") {
        setKycData({ full_name: kyc.full_name, date_of_birth: kyc.date_of_birth, id_number: kyc.id_number });
        if (kyc.selfie_url) setAvatarUrl(kyc.selfie_url);
      }
    };
    fetchUserData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (authLoading || walletLoading) return <LoadingScreen />;
  if (!user) return null;

  const userName = kycData?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Trader";
  const initials = userName.slice(0, 2).toUpperCase();
  const isVerified = kycStatus === "approved";
  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
  const accountHealth = [
    { label: "Identity", value: isVerified ? "Verified" : "Pending", ok: isVerified },
    { label: "Email", value: user.email_confirmed_at ? "Verified" : "Pending", ok: !!user.email_confirmed_at },
    { label: "Phone", value: user.phone ? "Verified" : "Not added", ok: !!user.phone },
    { label: "Transaction PIN", value: "Active", ok: true },
    { label: "2FA", value: isSubscribed ? "Enabled" : "Available", ok: isSubscribed },
  ];

  const sections = ([
    {
      title: "Trading Tools",
      items: [
        { icon: Wallet, title: "Live Trade", subtitle: "Access TradingView charting platform and advanced tools.", accent: "primary", action: "Open TradingView", to: "/trading", badge: "Live" },
        { icon: Shield, title: "AI Trade Assistant", subtitle: "Upload chart screenshot and get AI-powered market analysis and predictions.", accent: "accent", action: "Try AI Prediction", to: "/analyze", badge: "New" },
      ],
      grid: true,
    },
    {
      title: "Security",
      items: [
        { icon: Lock, title: "Change Password", to: "/auth" },
        { icon: Smartphone, title: "Change Transaction PIN", to: "/profile" },
        { icon: ShieldCheck, title: "Two-Factor Authentication", to: "/notification-settings" },
        { icon: Monitor, title: "Trusted Devices", to: "/notifications" },
        { icon: CalendarDays, title: "Login History", to: "/notifications" },
      ],
    },
    {
      title: "Verification",
      items: [
        { icon: ShieldCheck, title: "KYC Verification", subtitle: isVerified ? "Level 2 Verified" : "Verification required", to: "/kyc", accent: "primary" },
        { icon: FileText, title: "Documents", subtitle: "Manage your documents", to: "/kyc" },
        { icon: Landmark, title: "Bank Accounts", subtitle: "Manage linked banks", to: "/withdraw" },
        { icon: CreditCard, title: "Payment Methods", subtitle: "Manage payment options", to: "/deposit" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: theme === "dark" ? Moon : Sun, title: "Appearance", subtitle: theme === "dark" ? "Dark Mode" : theme === "light" ? "Light Mode" : "System", custom: "theme" },
        { icon: Globe, title: "Currency", subtitle: `${currency} (${format(wallet?.balance || 0)})`, custom: "currency" },
        { icon: Bell, title: "Notifications", subtitle: isSubscribed ? "Push, Email" : "Enable alerts", custom: "notifications" },
        { icon: Globe, title: "Language", subtitle: "English", to: "/help" },
      ],
    },
    {
      title: "Help & Support",
      items: [
        { icon: BookOpen, title: "How Felans FX Works", to: "/help" },
        { icon: FileText, title: "Screenshot Guide", to: "/screenshot-guide" },
        { icon: Users, title: "Contact Support", to: "/notifications" },
        { icon: HelpCircle, title: "FAQ", to: "/help" },
      ],
    },
  ]);

  return (
    <AppLayout>
      <div className="bg-fx-app">
        <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-5 safe-area-top">
          <header className="mb-4 flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-primary shadow-[0_0_0_4px_rgba(255,255,255,0.03)]">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-[linear-gradient(180deg,rgba(32,214,199,0.2),rgba(24,98,178,0.25))] text-lg font-bold text-white">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                  <BadgeCheck className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white truncate">{userName}</h1>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-white/74">
                  <span className="font-mono text-sm">{displayId || 'FX188380'}</span>
                  <Copy className="h-3.5 w-3.5" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary"><ShieldCheck className="h-3.5 w-3.5" /> Verified Account</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/74"><Shield className="h-3.5 w-3.5" /> Level 2 KYC</span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-white/56"><CalendarDays className="h-3.5 w-3.5" /> Member since {memberSince || 'Jan 2026'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('/notifications')} className="relative h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-destructive" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </header>

          <FintechCard className="mb-5 p-4">
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Account Health</h2>
                  <HelpCircle className="h-3.5 w-3.5 text-white/45" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {accountHealth.map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", item.ok ? 'bg-success/15 text-success' : 'bg-white/8 text-white/45')}>
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <p className="text-xs font-semibold text-white leading-tight">{item.label}</p>
                      <p className="text-[11px] text-white/52 leading-tight">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center border-l border-white/10 pl-3">
                <p className="text-xs text-white/65">Security Score</p>
                <div className="mt-3 flex h-20 w-20 items-center justify-center rounded-full border-[8px] border-primary/25 border-t-primary text-center">
                  <div>
                    <p className="text-xl font-bold text-white">95%</p>
                    <p className="text-[11px] text-primary">Excellent</p>
                  </div>
                </div>
              </div>
            </div>
          </FintechCard>

          {sections.map((section) => (
            <section key={section.title} className="mb-5">
              <h3 className="mb-3 text-[13px] uppercase tracking-[0.18em] text-white/48">{section.title}</h3>
              {section.grid ? (
                <div className="grid grid-cols-2 gap-3">
                  {section.items.map((item) => (
                    <FintechCard key={item.title} className="p-4 text-left" >
                      <button onClick={() => item.to && navigate(item.to)} className="flex h-full w-full flex-col items-start text-left">
                        <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", item.accent === 'primary' ? 'bg-primary/12 text-primary' : item.accent === 'accent' ? 'bg-accent/12 text-accent' : 'bg-white/6 text-white')}>
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div className="mb-1.5 flex items-center gap-2">
                          <p className="text-sm font-bold text-white leading-tight">{item.title}</p>
                          {item.badge ? <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">{item.badge}</span> : null}
                        </div>
                        <p className="text-xs leading-relaxed text-white/60">{item.subtitle}</p>
                        {item.action ? <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">{item.action} <ArrowRight className="h-3.5 w-3.5" /></p> : null}
                      </button>
                    </FintechCard>
                  ))}
                </div>
              ) : (
                <FintechCard className="overflow-hidden p-0">
                  {section.items.map((item, idx) => (
                    <div key={item.title}>
                      <button onClick={() => item.to && navigate(item.to)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03]">
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", item.accent === 'primary' ? 'bg-primary/12 text-primary' : 'bg-white/5 text-white')}>
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          {item.subtitle ? <p className="mt-1 text-sm text-white/52">{item.subtitle}</p> : null}
                          {item.custom === 'theme' ? (
                            <div className="mt-3 flex gap-2">
                              {(['light', 'dark', 'system'] as const).map((t) => (
                                <button key={t} type="button" onClick={(e) => { e.stopPropagation(); setTheme(t); }} className={cn('rounded-xl border px-3 py-2 text-sm', theme === t ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-white/55')}>
                                  {t}
                                </button>
                              ))}
                            </div>
                          ) : null}
                          {item.custom === 'currency' ? (
                            <div className="mt-3 max-w-[180px]" onClick={(e) => e.stopPropagation()}>
                              <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                                <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/5 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableCurrencies.map((c) => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null}
                          {item.custom === 'notifications' && isSupported ? (
                            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                              <Switch checked={isSubscribed} onCheckedChange={handlePushToggle} disabled={pushLoading} />
                            </div>
                          ) : null}
                        </div>
                        <ChevronRight className="h-5 w-5 text-white/35" />
                      </button>
                      {idx < section.items.length - 1 ? <div className="mx-4 h-px bg-white/8" /> : null}
                    </div>
                  ))}
                </FintechCard>
              )}
            </section>
          ))}

          <FintechCard className="mb-5 flex items-center justify-between p-5">
            <div>
              <p className="text-[1.7rem] font-bold text-white">Invite Friends</p>
              <p className="mt-2 text-base text-primary">Earn up to 20% referral rewards</p>
            </div>
            <button onClick={() => navigate('/invite')} className="rounded-2xl border border-primary/40 bg-primary/10 px-5 py-3 font-mono text-[1.6rem] text-white">
              {displayId || 'FX188380'}
            </button>
          </FintechCard>

          <Button variant="ghost" onClick={handleSignOut} className="mb-3 h-14 w-full rounded-2xl border border-destructive/70 text-lg font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="mr-2 h-5 w-5" /> Sign Out
          </Button>
          <p className="pb-6 text-center text-sm text-white/35">Version 3.0.4</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
