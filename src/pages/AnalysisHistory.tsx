import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Search, Filter, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  created_at: string;
}

const AnalysisHistory = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTrend, setFilterTrend] = useState<string>("all");
  const [filterFocus, setFilterFocus] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("analyses")
          .select("id, symbol, trade_focus, trend, trade_idea, entry_price, stop_loss, take_profit, rr_ratio, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAnalyses((data || []) as Analysis[]);
      } catch (error) {
        console.error("Error fetching analyses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [user]);

  const filteredAnalyses = analyses.filter((a) => {
    const matchesSearch = a.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrend = filterTrend === "all" || a.trend === filterTrend;
    const matchesFocus = filterFocus === "all" || a.trade_focus === filterFocus;
    return matchesSearch && matchesTrend && matchesFocus;
  });

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else if (newSelected.size < 3) {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleCompare = () => {
    if (selectedIds.size >= 2) {
      navigate(`/analysis/compare?ids=${Array.from(selectedIds).join(",")}`);
    }
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case "bullish":
        return <TrendingUp className="w-4 h-4 text-success" />;
      case "bearish":
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  return (
    <AppLayout>
      <Header title="Analysis History" showBack />

      <div className="px-4 py-4 space-y-4">
        {/* Search and Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Select value={filterTrend} onValueChange={setFilterTrend}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Trend" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trends</SelectItem>
              <SelectItem value="bullish">Bullish</SelectItem>
              <SelectItem value="bearish">Bearish</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterFocus} onValueChange={setFilterFocus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Focus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="scalp">Scalp</SelectItem>
              <SelectItem value="swing">Swing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Compare Button */}
        {selectedIds.size >= 2 && (
          <Button className="w-full gradient-primary" onClick={handleCompare}>
            <Layers className="w-4 h-4 mr-2" />
            Compare {selectedIds.size} Analyses
          </Button>
        )}

        {/* Selection Info */}
        <p className="text-xs text-muted-foreground text-center">
          Select 2-3 analyses to compare side by side
        </p>

        {/* Analyses List */}
        {filteredAnalyses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No analyses found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnalyses.map((analysis) => (
              <Card
                key={analysis.id}
                className={cn(
                  "border-0 shadow-md cursor-pointer transition-all",
                  selectedIds.has(analysis.id) && "ring-2 ring-primary"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(analysis.id)}
                      onCheckedChange={() => toggleSelection(analysis.id)}
                      className="mt-1"
                    />
                    <div
                      className="flex-1"
                      onClick={() => navigate(`/analysis/${analysis.id}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(analysis.trend)}
                          <span className="font-bold">{analysis.symbol}</span>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              analysis.trade_idea === "buy"
                                ? "bg-success/10 text-success"
                                : analysis.trade_idea === "sell"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {analysis.trade_idea?.toUpperCase() || "HOLD"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {analysis.trade_focus}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Entry:</span>{" "}
                          <span className="font-medium">{analysis.entry_price || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SL:</span>{" "}
                          <span className="font-medium text-destructive">{analysis.stop_loss || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">TP:</span>{" "}
                          <span className="font-medium text-success">{analysis.take_profit || "-"}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(analysis.created_at).toLocaleDateString()} at{" "}
                        {new Date(analysis.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
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

export default AnalysisHistory;
