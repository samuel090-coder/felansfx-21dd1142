import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  CreditCard,
  Share2,
  Bookmark,
  FileText,
  LogOut,
  ChevronRight,
  Crown,
  Bell,
  BellOff,
  Sun,
  Moon,
  Monitor,
  ShieldCheck,
  Globe,
  HelpCircle,
  Lock,
  Wallet,
  Sparkles,
  BadgeCheck,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTheme } from "@/hooks/useTheme";
import { useCurrencyPreference } from "@/hooks/useCurrencyPreference";
import { useBackgroundImage } from "@/hooks/useBackgroundImage";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfilePictureUpload } from "@/components/profile/ProfilePictureUpload";
import { BackgroundSelector } from "@/components/profile/BackgroundSelector";
import { SecuritySettings } from "@/components/profile/SecuritySettings";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const { bgUrl, uploading: bgUploading, uploadBackground, removeBackground, selectPreset } = useBackgroundImage();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(data === true);
    });
  }, [user]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      const { count } = await supabase
        .from("analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_saved", true);
      setSavedCount(count || 0);

      const { count: tradeCount } = await supabase
        .from("demo_trade_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setTotalTrades(tradeCount || 0);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_id, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      setDisplayId(profile?.display_id || null);
      setAvatarUrl(profile?.avatar_url || null);

      const { data: kyc } = await supabase
        .from("kyc_verifications")
        .select("status, full_name, date_of_birth, id_number, selfie_url")
        .eq("user_id", user.id)
        .maybeSingle();
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

  const handleRefreshSubscription = async () => {
    await subscribe(true);
  };

  if (authLoading || walletLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  const userName = kycData?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Trader";
  const initials = userName.slice(0, 2).toUpperCase();
  const isVerified = kycStatus === "approved";
  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";

  const menuItems = [
    ...(isAdmin ? [{ icon: Settings, label: "Admin Panel", to: "/admin", accent: true }] : []),
    { icon: CreditCard, label: "Manage Deposits", to: "/deposit" },
    { icon: ShieldCheck, label: isVerified ? "KYC Verified" : "Verify Identity (KYC)", to: "/kyc", verified: isVerified },
    { icon: Bell, label: "Notification Settings", to: "/notification-settings" },
    { icon: FileText, label: "Screenshot Guide", to: "/screenshot-guide" },
    { icon: Share2, label: "Invite Friends", to: "/invite" },
    { icon: Bookmark, label: "My Saved Setups", to: "/saved" },
    { icon: HelpCircle, label: "How Felans FX Works", to: "/help" },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Hero Profile Header */}
        <div className="relative overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent" />
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/20 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-primary-foreground/10 blur-xl" />
          
          {isVerified && (
            <>
              {/* Celebration sparkle dots for verified users */}
              <div className="absolute top-4 right-8 w-2 h-2 rounded-full bg-primary-foreground/60 animate-pulse" />
              <div className="absolute top-12 right-16 w-1.5 h-1.5 rounded-full bg-accent/80 animate-pulse" style={{ animationDelay: "0.3s" }} />
              <div className="absolute top-6 right-24 w-1 h-1 rounded-full bg-primary-foreground/40 animate-pulse" style={{ animationDelay: "0.6s" }} />
              <div className="absolute top-16 left-12 w-1.5 h-1.5 rounded-full bg-primary-foreground/50 animate-pulse" style={{ animationDelay: "0.9s" }} />
              <div className="absolute bottom-20 right-6 w-2 h-2 rounded-full bg-accent/60 animate-pulse" style={{ animationDelay: "1.2s" }} />
            </>
          )}

          <div className="relative z-10 px-5 pt-8 pb-16">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-lg font-semibold text-primary-foreground">My Profile</h1>
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => navigate("/admin")}
                >
                  <Settings className="w-4 h-4 mr-1" /> Admin
                </Button>
              )}
            </div>

            {/* Avatar + Info */}
            <div className="flex items-center gap-4">
              <div className={`relative ${isVerified ? 'ring-2 ring-primary-foreground/40 ring-offset-2 ring-offset-primary rounded-full' : ''}`}>
                <ProfilePictureUpload
                  currentUrl={avatarUrl}
                  initials={initials}
                  onUpload={setAvatarUrl}
                  locked={isVerified}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-xl font-bold text-primary-foreground truncate">{userName}</h2>
                  {isVerified && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <BadgeCheck className="w-5 h-5 text-primary-foreground shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px] text-center">
                          <p className="text-xs">Identity verified through KYC — name and photo are locked.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className="text-sm text-primary-foreground/70 truncate">{user.email}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {displayId && (
                    <span className="text-xs font-mono text-primary-foreground/60 bg-primary-foreground/10 px-2 py-0.5 rounded-full">{displayId}</span>
                  )}
                  {memberSince && (
                    <span className="text-xs text-primary-foreground/50">Member since {memberSince}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Celebration Banner */}
        {isVerified && (
          <div className="mx-4 -mt-6 relative z-20 mb-4">
            <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Verified Account</p>
                <p className="text-xs text-muted-foreground">Your identity is verified. Enjoy full platform features.</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            </div>
          </div>
        )}

        {/* Stats Cards - Overlapping the hero */}
        <div className={`px-4 ${!isVerified ? '-mt-6' : ''} relative z-20`}>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-card border border-border rounded-2xl p-3 text-center shadow-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1.5">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <p className="text-base font-bold text-foreground">{format(wallet?.balance || 0)}</p>
              <p className="text-[10px] text-muted-foreground">Balance</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-3 text-center shadow-sm">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-1.5">
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <p className="text-base font-bold text-foreground">{totalTrades}</p>
              <p className="text-[10px] text-muted-foreground">Trades</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-3 text-center shadow-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1.5">
                <Bookmark className="w-4 h-4 text-primary" />
              </div>
              <p className="text-base font-bold text-foreground">{savedCount}</p>
              <p className="text-[10px] text-muted-foreground">Saved</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button
              className="h-auto py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-2xl shadow-sm"
              onClick={() => navigate("/deposit")}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Deposit
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 rounded-2xl border-border"
              onClick={() => navigate("/invite")}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Invite
            </Button>
          </div>

          {/* Settings Section */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4 shadow-sm">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preferences</p>
            </div>

            {/* Push Notifications */}
            {isSupported && (
              <>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      {isSubscribed ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">{isSubscribed ? "Enabled" : "Disabled"}</p>
                    </div>
                  </div>
                  <Switch checked={isSubscribed} onCheckedChange={handlePushToggle} disabled={pushLoading} />
                </div>
                {isSubscribed && (
                  <div className="px-4 pb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-primary/30 text-primary"
                      onClick={handleRefreshSubscription}
                      disabled={pushLoading}
                    >
                      🔄 {pushLoading ? "Refreshing..." : "Refresh Subscription"}
                    </Button>
                  </div>
                )}
                <Separator />
              </>
            )}

            {/* Theme */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  {theme === "dark" ? <Moon className="w-4 h-4 text-primary" /> : theme === "light" ? <Sun className="w-4 h-4 text-primary" /> : <Monitor className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-sm font-medium">Theme</p>
              </div>
              <div className="flex gap-1 bg-muted rounded-xl p-0.5">
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    className={`p-1.5 rounded-lg transition-colors ${theme === t ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setTheme(t)}
                  >
                    {t === "light" ? <Sun className="w-3.5 h-3.5" /> : t === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
            <Separator />

            {/* Currency */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-medium">Currency</p>
              </div>
              <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Background & Security */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4 shadow-sm">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personalization & Security</p>
            </div>
            <div className="p-4 space-y-4">
              <BackgroundSelector
                currentBg={bgUrl}
                uploading={bgUploading}
                onUpload={uploadBackground}
                onRemove={removeBackground}
                onSelectPreset={selectPreset}
              />
              <SecuritySettings />
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4 shadow-sm">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</p>
            </div>
            {menuItems.map((item, index) => (
              <div key={item.label}>
                <button
                  onClick={() => navigate(item.to)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      'accent' in item && item.accent ? 'bg-accent/10' : 
                      'verified' in item && item.verified ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <item.icon className={`w-4 h-4 ${
                        'accent' in item && item.accent ? 'text-accent' :
                        'verified' in item && item.verified ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                    {'verified' in item && item.verified && (
                      <BadgeCheck className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                {index < menuItems.length - 1 && <Separator />}
              </div>
            ))}
          </div>

          {/* Sign Out */}
          <div className="mb-10">
            <Button
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/10 rounded-2xl h-12"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;