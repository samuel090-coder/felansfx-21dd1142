import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Analysis {
  id: string;
  symbol: string;
  trade_focus: "scalp" | "swing";
  trend: "bullish" | "bearish" | "neutral" | null;
  trade_idea: "buy" | "sell" | "hold" | null;
  entry_price: string | null;
  stop_loss: string | null;
  take_profit: string | null;
  rr_ratio: string | null;
  strength: string | null;
  duration: string | null;
  analysis_text: string | null;
  created_at: string;
}

const AnalysisCompare = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  const ids = searchParams.get("ids")?.split(",") || [];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!user || ids.length < 2) {
        navigate("/history");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("analyses")
          .select("*")
          .eq("user_id", user.id)
          .in("id", ids);

        if (error) throw error;
        setAnalyses((data || []) as Analysis[]);
      } catch (error) {
        console.error("Error fetching analyses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [user, ids.join(",")]);

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case "bullish":
        return <TrendingUp className="w-5 h-5 text-success" />;
      case "bearish":
        return <TrendingDown className="w-5 h-5 text-destructive" />;
      default:
        return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTradeIdeaColor = (idea: string | null) => {
    switch (idea) {
      case "buy":
        return "text-success";
      case "sell":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (analyses.length < 2) {
    return (
      <AppLayout hideNav>
        <Header title="Compare Analyses" showBack />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Select at least 2 analyses to compare</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideNav>
      <Header title="Compare Analyses" showBack />

      <div className="px-4 py-4">
        {/* Side by Side Grid */}
        <div className={cn("grid gap-4", analyses.length === 2 ? "grid-cols-2" : "grid-cols-1 md:grid-cols-3")}>
          {analyses.map((analysis) => (
            <Card key={analysis.id} className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  {getTrendIcon(analysis.trend)}
                  <CardTitle className="text-lg">{analysis.symbol}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(analysis.created_at).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Trade Idea */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Trade Idea</span>
                  <span className={cn("font-bold uppercase", getTradeIdeaColor(analysis.trade_idea))}>
                    {analysis.trade_idea || "Hold"}
                  </span>
                </div>

                {/* Entry */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Entry</span>
                  <span className="font-medium">{analysis.entry_price || "-"}</span>
                </div>

                {/* Stop Loss */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Stop Loss</span>
                  <span className="font-medium text-destructive">{analysis.stop_loss || "-"}</span>
                </div>

                {/* Take Profit */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Take Profit</span>
                  <span className="font-medium text-success">{analysis.take_profit || "-"}</span>
                </div>

                {/* RR Ratio */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">R:R Ratio</span>
                  <span className="font-bold text-primary">{analysis.rr_ratio || "-"}</span>
                </div>

                {/* Strength */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Strength</span>
                  <span className="font-medium capitalize">{analysis.strength || "-"}</span>
                </div>

                {/* Duration */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="font-medium">{analysis.duration || "-"}</span>
                </div>

                {/* Trade Focus */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Focus</span>
                  <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full capitalize">
                    {analysis.trade_focus}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Analysis Text Comparison */}
        <div className="mt-6 space-y-4">
          <h3 className="font-medium">Analysis Details</h3>
          {analyses.map((analysis) => (
            <Card key={analysis.id} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {getTrendIcon(analysis.trend)}
                  {analysis.symbol}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {analysis.analysis_text || "No detailed analysis available."}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default AnalysisCompare;
