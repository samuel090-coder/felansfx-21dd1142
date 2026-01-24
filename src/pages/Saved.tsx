import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Analysis {
  id: string;
  symbol: string;
  trade_focus: string;
  trend: string;
  trade_idea: string;
  created_at: string;
}

const Saved = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchSaved = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("analyses")
          .select("id, symbol, trade_focus, trend, trade_idea, created_at")
          .eq("user_id", user.id)
          .eq("is_saved", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAnalyses(data || []);
      } catch (error) {
        console.error("Error fetching saved analyses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSaved();
  }, [user]);

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <Header title="Saved Analyses" />

      <div className="px-4 py-4">
        {analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bookmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-2">No Saved Analyses</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Save your trade analyses to review them later. Tap the bookmark icon on any analysis to save it.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <Card
                key={analysis.id}
                className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/analysis/${analysis.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          analysis.trend === "bullish"
                            ? "bg-analysis-bullish"
                            : analysis.trend === "bearish"
                            ? "bg-analysis-bearish"
                            : "bg-analysis-neutral"
                        )}
                      >
                        {analysis.trend === "bullish" ? (
                          <TrendingUp className="w-5 h-5 text-analysis-bullish-text" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-analysis-bearish-text" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{analysis.symbol}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(analysis.created_at).toLocaleDateString()} ·{" "}
                          <span className="capitalize">{analysis.trade_focus}</span> ·{" "}
                          <span className="capitalize">{analysis.trade_idea}</span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Saved;
