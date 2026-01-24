import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bookmark, BookmarkCheck, TrendingUp, TrendingDown, Target, Shield, DollarSign, Clock, Gauge, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisCard } from "@/components/analysis/AnalysisCard";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Analysis {
  id: string;
  symbol: string;
  trade_focus: string;
  trend: string;
  trade_idea: string;
  entry_price: string;
  stop_loss: string;
  take_profit: string;
  rr_ratio: string;
  strength: string;
  duration: string;
  analysis_text: string;
  risk_warning: string;
  is_saved: boolean;
  created_at: string;
}

const AnalysisResult = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!id || !user) return;

      try {
        const { data, error } = await supabase
          .from("analyses")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        setAnalysis(data);
      } catch (error) {
        console.error("Error fetching analysis:", error);
        toast.error("Analysis not found");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id, user, navigate]);

  const toggleSave = async () => {
    if (!analysis) return;

    try {
      const { error } = await supabase
        .from("analyses")
        .update({ is_saved: !analysis.is_saved })
        .eq("id", analysis.id);

      if (error) throw error;

      setAnalysis({ ...analysis, is_saved: !analysis.is_saved });
      toast.success(analysis.is_saved ? "Removed from saved" : "Saved successfully");
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (!analysis) {
    return null;
  }

  const formattedDate = new Date(analysis.created_at).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = new Date(analysis.created_at).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <AppLayout hideNav>
      <Header
        title="Trade Analysis"
        showBack
        rightElement={
          <Button variant="ghost" size="icon" onClick={toggleSave}>
            {analysis.is_saved ? (
              <BookmarkCheck className="w-5 h-5 text-primary" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </Button>
        }
      />

      <div className="px-4 py-4">
        {/* Mark Outcome Button */}
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" className="gradient-primary text-white border-0">
            Mark Analysis Outcome
          </Button>
        </div>

        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6 text-sm">
          <div>
            <span className="text-muted-foreground">Pair: </span>
            <span className="font-medium">{analysis.symbol}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Time: </span>
            <span className="font-medium">{formattedTime}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Bias: </span>
            <span className="font-medium capitalize">{analysis.trade_focus}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Date: </span>
            <span className="font-medium">{formattedDate}</span>
          </div>
        </div>

        {/* Analysis Cards */}
        <div className="space-y-3">
          {/* Trend and Trade Idea */}
          <div className="grid grid-cols-2 gap-3">
            <AnalysisCard
              label="TREND"
              value={analysis.trend?.charAt(0).toUpperCase() + analysis.trend?.slice(1) || "N/A"}
              variant={analysis.trend === "bullish" ? "bullish" : analysis.trend === "bearish" ? "bearish" : "neutral"}
              icon={analysis.trend === "bullish" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            />
            <AnalysisCard
              label="TRADE IDEA"
              value={analysis.trade_idea?.charAt(0).toUpperCase() + analysis.trade_idea?.slice(1) || "N/A"}
              variant={analysis.trade_idea === "buy" ? "bullish" : analysis.trade_idea === "sell" ? "bearish" : "neutral"}
              icon={<Target className="w-4 h-4" />}
            />
          </div>

          {/* Entry */}
          <AnalysisCard
            label="ENTRY"
            value={analysis.entry_price || "N/A"}
            variant="entry"
            icon={<LayoutGrid className="w-4 h-4" />}
          />

          {/* SL and TP */}
          <div className="grid grid-cols-2 gap-3">
            <AnalysisCard
              label="SL"
              value={analysis.stop_loss || "N/A"}
              variant="sl"
              icon={<Shield className="w-4 h-4" />}
            />
            <AnalysisCard
              label="TP"
              value={analysis.take_profit || "N/A"}
              variant="tp"
              icon={<DollarSign className="w-4 h-4" />}
            />
          </div>

          {/* RR Ratio */}
          <AnalysisCard
            label="RR RATIO"
            value={analysis.rr_ratio || "N/A"}
            variant="rr"
            icon={<LayoutGrid className="w-4 h-4" />}
          />

          {/* Strength and Duration */}
          <div className="grid grid-cols-2 gap-3">
            <AnalysisCard
              label="STRENGTH"
              value={analysis.strength || "N/A"}
              icon={<Gauge className="w-4 h-4" />}
            />
            <AnalysisCard
              label="DURATION"
              value={analysis.duration || "N/A"}
              icon={<Clock className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Analysis Text */}
        {analysis.analysis_text && (
          <Card className="mt-6 border-0 shadow-md">
            <CardContent className="pt-4">
              <h3 className="font-medium mb-2">Analysis Summary</h3>
              <p className="text-sm text-muted-foreground">{analysis.analysis_text}</p>
            </CardContent>
          </Card>
        )}

        {/* Risk Warning */}
        <Card className="mt-4 border-warning/50 bg-warning/5">
          <CardContent className="pt-4">
            <h3 className="font-medium text-warning mb-2">⚠️ Risk Warning</h3>
            <p className="text-sm text-muted-foreground">
              {analysis.risk_warning ||
                "Trading carries significant risk. Past performance is not indicative of future results. Only trade with funds you can afford to lose."}
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pb-4">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
            Back to Home
          </Button>
          <Button className="flex-1 gradient-primary" onClick={() => navigate("/analyze")}>
            New Analysis
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default AnalysisResult;
