import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, TrendingUp, Zap, Bot, Rocket } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

interface DailyStreakSettings {
  title: string;
  subtitle: string;
  features: { emoji: string; text: string }[];
  highlight_text: string;
  unlock_price: number;
}

interface ProContent {
  id: string;
  title: string;
  content: string;
  content_type: string;
}

const iconMap: { [key: string]: React.ElementType } = {
  "📈": TrendingUp,
  "⚡": Zap,
  "🤖": Bot,
  "🚀": Rocket,
};

const DailyStreak = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, loading: walletLoading, refetch: refreshWallet } = useWallet();
  const [settings, setSettings] = useState<DailyStreakSettings | null>(null);
  const [proContent, setProContent] = useState<ProContent[]>([]);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Check if user has unlocked
      const { data: unlock } = await supabase
        .from("user_unlocks")
        .select("*")
        .eq("user_id", user.id)
        .eq("unlock_type", "daily_streak")
        .maybeSingle();

      setHasUnlocked(!!unlock);

      if (unlock) {
        // Fetch pro content
        const { data: content } = await supabase
          .from("pro_content")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });
        setProContent(content || []);
      }

      // Fetch settings
      const { data: settingsData } = await supabase
        .from("daily_streak_settings")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (settingsData) {
        setSettings({
          title: settingsData.title,
          subtitle: settingsData.subtitle,
          features: settingsData.features as { emoji: string; text: string }[],
          highlight_text: settingsData.highlight_text || "",
          unlock_price: settingsData.unlock_price,
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleUnlock = async () => {
    if (!user || !settings) return;

    const balance = wallet?.balance || 0;
    if (balance < settings.unlock_price) {
      setShowSubscriptionModal(true);
      return;
    }

    setUnlocking(true);
    try {
      // Deduct wallet
      const { data: success } = await supabase.rpc("deduct_user_wallet", {
        p_user_id: user.id,
        p_amount: settings.unlock_price,
      });

      if (!success) {
        toast.error("Insufficient balance");
        setShowSubscriptionModal(true);
        return;
      }

      // Create unlock record
      await supabase.from("user_unlocks").insert({
        user_id: user.id,
        unlock_type: "daily_streak",
      });

      // Refresh data
      await refreshWallet();
      setHasUnlocked(true);
      
      // Fetch pro content
      const { data: content } = await supabase
        .from("pro_content")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setProContent(content || []);

      toast.success("Daily Streak Unlocked!");
    } catch (error) {
      console.error("Unlock error:", error);
      toast.error("Failed to unlock. Please try again.");
    } finally {
      setUnlocking(false);
    }
  };

  if (authLoading || walletLoading || loading) {
    return <LoadingScreen />;
  }

  if (!user) return null;

  // If unlocked, show pro content
  if (hasUnlocked) {
    return (
      <AppLayout>
        <div className="px-4 pt-6 pb-24">
          <div className="flex items-center gap-2 mb-6">
            <Crown className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-display font-bold">Daily Edge - Unlocked</h1>
          </div>

          {proContent.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  No content available yet. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {proContent.map((content) => (
                <Card key={content.id} className="border-0 shadow-md">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">{content.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {content.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // Locked state
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="px-4 pt-8 pb-24">
          {/* Header Card */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-6">
              {/* Badge */}
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="font-medium text-sm">FxLens Pro — Daily Edge Unlocked</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-display font-bold text-center mb-3">
                {settings?.title || "Unlock Curated Daily Analysis"}
              </h1>

              <p className="text-center text-muted-foreground text-sm mb-6">
                {settings?.subtitle}
              </p>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {settings?.features.map((feature, index) => {
                  const IconComponent = iconMap[feature.emoji] || TrendingUp;
                  return (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{feature.emoji}</span>
                        <span className="text-xs leading-tight">{feature.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Highlight */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
                <p className="text-sm text-center text-primary font-medium">
                  {settings?.highlight_text}
                </p>
              </div>

              {/* Unlock Button */}
              <Button
                onClick={handleUnlock}
                disabled={unlocking}
                className="w-full py-6 text-lg font-semibold gradient-primary shadow-primary"
              >
                {unlocking ? "Unlocking..." : "Unlock Full Access"}
              </Button>

              <p className="text-center text-xs text-muted-foreground mt-3">
                Cost: {formatCurrency(settings?.unlock_price || 5000, "NGN")} from your wallet
              </p>

              <p className="text-center text-xs text-muted-foreground mt-2">
                Join serious traders who use FxLens to keep their decisions crisp and accountable.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
      />
    </AppLayout>
  );
};

export default DailyStreak;
