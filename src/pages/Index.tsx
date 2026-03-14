import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Wallet, Bot, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useAppSettings } from "@/hooks/useAppSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuickActionCard } from "@/components/home/QuickActionCard";
import { RecommendedToolsCarousel } from "@/components/home/RecommendedToolsCarousel";
import { MainMenuDrawer } from "@/components/layout/MainMenuDrawer";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { Link } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, loading: walletLoading } = useWallet();
  const { settings } = useAppSettings();
  const { requestPermission, permission, isSubscribed, subscribe, isLoading: pushLoading } = usePushNotifications();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && permission === "default") {
      const timer = setTimeout(() => {
        requestPermission();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, permission, requestPermission]);

  if (authLoading || walletLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Trader";

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-display font-semibold">Hello {userName}</h1>
              <p className="text-sm text-muted-foreground">
                Take more profitable trades now 📈
              </p>
            </div>
          </div>
          <MainMenuDrawer />
        </div>

        {/* Wallet Card */}
        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Wallet Balance</p>
                  <p className="text-xl font-bold">{formatCurrency(wallet?.balance || 0, "NGN")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/send-funds")}
                  className="border-primary text-primary hover:bg-primary hover:text-white"
                >
                  Send
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/deposit")}
                  className="border-primary text-primary hover:bg-primary hover:text-white"
                >
                  Add Funds
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <QuickActionCard title="Learning hub" to="/patterns" />
          <QuickActionCard title="Share" to="/invite" />
          <QuickActionCard title="More" to="/saved" />
        </div>

        {/* Subscribe CTA */}
        {!isSubscribed && (
          <Card className="mb-4 border-0 shadow-md bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <Button
                className="w-full gradient-primary font-semibold"
                onClick={() => subscribe()}
                disabled={pushLoading}
              >
                🔔 {pushLoading ? "Enabling..." : "Get Daily FX Signals & Alerts – Free"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recommended Tools Carousel */}
        <RecommendedToolsCarousel />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 py-6">
          <Link
            to="/analyze"
            className="flex flex-col items-center justify-center p-6 rounded-2xl gradient-primary shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95"
          >
            <Bot className="w-10 h-10 text-white mb-2" />
            <span className="text-white text-base font-bold">AI Analysis</span>
          </Link>
          <Link
            to="/trading"
            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95"
          >
            <BarChart3 className="w-10 h-10 text-white mb-2" />
            <span className="text-white text-base font-bold">Live Trading</span>
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-4 px-4">
          Analysis cost: {formatCurrency(parseFloat(settings.analysis_cost) / 0.00063, "NGN")} per analysis.
        </p>
      </div>
    </AppLayout>
  );
};

export default Index;
