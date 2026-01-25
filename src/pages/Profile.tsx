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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ProfilePictureUpload } from "@/components/profile/ProfilePictureUpload";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { wallet, loading: walletLoading } = useWallet();
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const [savedCount, setSavedCount] = useState(0);
  const [displayId, setDisplayId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      // Fetch saved count
      const { count } = await supabase
        .from("analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_saved", true);
      setSavedCount(count || 0);
      
      // Fetch display ID and avatar
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_id, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      setDisplayId(profile?.display_id || null);
      setAvatarUrl(profile?.avatar_url || null);
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

  if (authLoading || walletLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Trader";
  const initials = userName.slice(0, 2).toUpperCase();

  const menuItems = [
    { icon: CreditCard, label: "Manage deposits", to: "/deposit" },
    { icon: FileText, label: "Screenshot Guide", to: "/screenshot-guide" },
    { icon: Share2, label: "Invite friends", to: "/invite" },
    { icon: Bookmark, label: "My saved setups", to: "/saved" },
  ];

  return (
    <AppLayout>
      <div className="px-4 pt-6">
        {/* Profile Card */}
        <Card className="mb-6 border-0 shadow-md">
          <CardContent className="pt-6">
            {/* Badge */}
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                <Crown className="w-3 h-3" />
                Active
              </span>
            </div>

            {/* Avatar and Name */}
            <div className="flex items-center gap-4 mb-6">
              <ProfilePictureUpload
                currentUrl={avatarUrl}
                initials={initials}
                onUpload={setAvatarUrl}
              />
              <div>
                <h2 className="text-xl font-display font-semibold">{userName}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {displayId && (
                  <p className="text-xs text-primary font-medium mt-1">ID: {displayId}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <p className="text-2xl font-bold">{savedCount}</p>
                <p className="text-xs text-muted-foreground">Saved trades</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <p className="text-2xl font-bold">{formatCurrency(wallet?.balance || 0, "NGN", { decimals: 0 })}</p>
                <p className="text-xs text-muted-foreground">Credit balance</p>
              </div>
            </div>

            {/* Push Notifications Toggle */}
            {isSupported && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 mb-4">
                <div className="flex items-center gap-3">
                  {isSubscribed ? (
                    <Bell className="w-5 h-5 text-primary" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      {isSubscribed ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
                <Switch checked={isSubscribed} onCheckedChange={handlePushToggle} />
              </div>
            )}

            {/* Invite Button */}
            <Button className="w-full gradient-primary shadow-primary">
              <Share2 className="w-4 h-4 mr-2" />
              Invite friends
            </Button>
          </CardContent>
        </Card>

        {/* Menu */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <div key={item.label}>
                <button
                  onClick={() => navigate(item.to)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                {index < menuItems.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <div className="mt-6 mb-8">
          <p className="text-sm text-destructive font-medium mb-3 px-1">Danger zone</p>
          <Button
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
