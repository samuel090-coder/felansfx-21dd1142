import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useAppSettings } from "@/hooks/useAppSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuickActionCard } from "@/components/home/QuickActionCard";
import { StartAnalysisButton } from "@/components/home/StartAnalysisButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatWithConversion } from "@/lib/currency";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, loading: walletLoading } = useWallet();
  const { settings } = useAppSettings();
  const { requestPermission, permission } = usePushNotifications();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Request notification permission on first login
  useEffect(() => {
    if (user && permission === "default") {
      // Small delay to not overwhelm user immediately
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
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-display font-semibold">Hello {userName}</h1>
              <p className="text-sm text-muted-foreground">
                Take more profitable trades now
              </p>
            </div>
          </div>
          <NotificationBell />
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
                  <p className="text-xl font-bold">{formatWithConversion(wallet?.balance || 0).combined}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/deposit")}
                className="border-primary text-primary hover:bg-primary hover:text-white"
              >
                Add Funds
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <QuickActionCard title="Journal trades" to="/saved" />
          <QuickActionCard title="Saved" to="/saved" />
          <QuickActionCard title="Deposit" to="/deposit" />
          <QuickActionCard title="Learning" to="/patterns" />
          <QuickActionCard title="News outlook" to="/news" />
          <QuickActionCard title="Trade plan" to="/analyze" />
        </div>

        {/* Info Section */}
        <Card className="mb-6 border-0 shadow-md overflow-hidden">
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-xl">
            <div className="absolute inset-0 opacity-30">
              <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')]" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-primary font-medium">Market Analysis</span>
              </div>
              <p className="text-white font-medium mb-1">Smart Analysis Tools</p>
              <p className="text-slate-400 text-xs">
                Get data-driven insights to help you make informed trading decisions
              </p>
            </div>
          </div>
        </Card>

        {/* Start Analysis CTA */}
        <div className="flex justify-center py-4">
          <StartAnalysisButton />
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-4 px-4">
          Analysis cost: {formatWithConversion(parseFloat(settings.analysis_cost) / 0.00063).combined} per analysis. All trading involves risk.
        </p>
      </div>
    </AppLayout>
  );
};

export default Index;
