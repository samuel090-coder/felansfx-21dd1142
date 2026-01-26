import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, TrendingUp, TrendingDown, Zap, Bot, Rocket, Target, AlertTriangle, DollarSign, Newspaper, Calendar, Lightbulb, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { SignalCard } from "@/components/daily-streak/SignalCard";
import { NewsCard } from "@/components/daily-streak/NewsCard";
import { GuideCard } from "@/components/daily-streak/GuideCard";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { format } from "date-fns";

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
  video_url: string | null;
}

interface DailySignal {
  id: string;
  symbol: string;
  trade_type: string;
  entry_price: string;
  stop_loss: string;
  take_profit: string;
  risk_reward: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface MarketNews {
  id: string;
  title: string;
  content: string;
  news_type: string;
  importance: string;
  source: string | null;
  published_at: string;
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
  const [signals, setSignals] = useState<DailySignal[]>([]);
  const [news, setNews] = useState<MarketNews[]>([]);
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
        // Fetch all content in parallel
        const [contentRes, signalsRes, newsRes] = await Promise.all([
          supabase
            .from("pro_content")
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true }),
          supabase
            .from("daily_signals")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("market_news")
            .select("*")
            .eq("is_active", true)
            .order("published_at", { ascending: false })
            .limit(20),
        ]);

        setProContent(contentRes.data || []);
        setSignals(signalsRes.data || []);
        setNews(newsRes.data || []);
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
      
      // Fetch all content
      const [contentRes, signalsRes, newsRes] = await Promise.all([
        supabase
          .from("pro_content")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("daily_signals")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("market_news")
          .select("*")
          .eq("is_active", true)
          .order("published_at", { ascending: false })
          .limit(20),
      ]);

      setProContent(contentRes.data || []);
      setSignals(signalsRes.data || []);
      setNews(newsRes.data || []);

      toast.success("Daily Streak Unlocked!");
    } catch (error) {
      console.error("Unlock error:", error);
      toast.error("Failed to unlock. Please try again.");
    } finally {
      setUnlocking(false);
    }
  };

  const getVideoEmbed = (url: string) => {
    if (!url) return null;
    
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    return null;
  };

  const getNewsIcon = (type: string) => {
    switch (type) {
      case "calendar":
        return <Calendar className="w-4 h-4 text-primary" />;
      case "insight":
        return <Lightbulb className="w-4 h-4 text-amber-500" />;
      default:
        return <Newspaper className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case "high":
        return <Badge className="bg-destructive text-destructive-foreground text-xs">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-500 text-white text-xs">Medium</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Low</Badge>;
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
            <h1 className="text-xl font-display font-bold">Daily Edge - Pro</h1>
          </div>

          <Tabs defaultValue="signals" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="signals" className="text-xs">Signals</TabsTrigger>
              <TabsTrigger value="news" className="text-xs">News</TabsTrigger>
              <TabsTrigger value="content" className="text-xs">Guides</TabsTrigger>
            </TabsList>

            {/* Signals Tab */}
            <TabsContent value="signals" className="space-y-3">
              {signals.length === 0 ? (
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No active signals. Check back soon!</p>
                  </CardContent>
                </Card>
              ) : (
                signals.map((signal) => (
                 <SignalCard
                   key={signal.id}
                   symbol={signal.symbol}
                   tradeType={signal.trade_type}
                   entryPrice={signal.entry_price}
                   stopLoss={signal.stop_loss}
                   takeProfit={signal.take_profit}
                   riskReward={signal.risk_reward || undefined}
                   status={signal.status}
                   notes={signal.notes || undefined}
                   isActive={true}
                 />
                ))
              )}
            </TabsContent>

            {/* News Tab */}
            <TabsContent value="news" className="space-y-3">
              {news.length === 0 ? (
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No news available. Check back soon!</p>
                  </CardContent>
                </Card>
              ) : (
                news.map((item) => (
                 <NewsCard
                   key={item.id}
                   title={item.title}
                   content={item.content}
                   newsType={item.news_type}
                   importance={item.importance || "medium"}
                   publishedAt={item.published_at}
                   source={item.source || undefined}
                 />
                ))
              )}
            </TabsContent>

            {/* Content/Guides Tab */}
            <TabsContent value="content" className="space-y-3">
              {proContent.length === 0 ? (
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No content available yet. Check back soon!</p>
                  </CardContent>
                </Card>
              ) : (
                proContent.map((content) => (
                 <GuideCard
                   key={content.id}
                   title={content.title}
                   content={content.content}
                   contentType={content.content_type}
                   videoUrl={content.video_url || undefined}
                 />
                ))
              )}
            </TabsContent>
          </Tabs>
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
