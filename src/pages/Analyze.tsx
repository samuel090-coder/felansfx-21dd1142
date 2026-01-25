import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, AlertTriangle, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useAppSettings } from "@/hooks/useAppSettings";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SymbolSelect } from "@/components/analysis/SymbolSelect";
import { ChartUploadGuide } from "@/components/analysis/ChartUploadGuide";
import { supabase, uploadFile } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = 1 | 2;
type TradeFocus = "scalp" | "swing";

const Analyze = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const { settings } = useAppSettings();

  const [step, setStep] = useState<Step>(1);
  const [symbol, setSymbol] = useState("");
  const [tradeFocus, setTradeFocus] = useState<TradeFocus>("scalp");
  const [chart4h, setChart4h] = useState<File | null>(null);
  const [chart15m, setChart15m] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [todayCount, setTodayCount] = useState(0);

  const analysisCost = parseFloat(settings.analysis_cost);
  const dailyLimit = parseInt(settings.daily_analysis_limit);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchTodayCount = async () => {
      if (!user) return;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count } = await supabase
        .from("analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString());
      
      setTodayCount(count || 0);
    };
    fetchTodayCount();
  }, [user]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setter(file);
    }
  };

  const handleAnalyze = async () => {
    if (!user || !symbol) {
      toast.error("Please enter a symbol");
      return;
    }

    if (!wallet || wallet.balance < analysisCost) {
      toast.error("Insufficient balance. Please deposit funds.");
      navigate("/deposit");
      return;
    }

    if (todayCount >= dailyLimit) {
      toast.error(`Daily analysis limit (${dailyLimit}) reached. Try again tomorrow.`);
      return;
    }

    setIsAnalyzing(true);

    try {
      // Upload charts if provided
      let chart4hUrl = null;
      let chart15mUrl = null;

      if (chart4h) {
        const path = `${user.id}/charts/${Date.now()}_4h_${chart4h.name}`;
        chart4hUrl = await uploadFile("uploads", path, chart4h);
      }

      if (chart15m) {
        const path = `${user.id}/charts/${Date.now()}_15m_${chart15m.name}`;
        chart15mUrl = await uploadFile("uploads", path, chart15m);
      }

      // Call AI analysis edge function
      const { data, error } = await supabase.functions.invoke("analyze-trade", {
        body: {
          symbol,
          tradeFocus,
          chart4hUrl,
          chart15mUrl,
        },
      });

      if (error) throw error;

      // Check for invalid chart response
      if (data?.error) {
        toast.error(data.message || data.error);
        setIsAnalyzing(false);
        return;
      }

      // Deduct from wallet using secure database function
      const { data: deductSuccess, error: walletError } = await supabase.rpc("deduct_user_wallet", {
        p_user_id: user.id,
        p_amount: analysisCost,
      });

      if (walletError || !deductSuccess) throw new Error("Failed to deduct from wallet");

      // Save analysis
      const { data: analysis, error: analysisError } = await supabase
        .from("analyses")
        .insert({
          user_id: user.id,
          symbol,
          trade_focus: tradeFocus,
          chart_4h_url: chart4hUrl,
          chart_15m_url: chart15mUrl,
          trend: data.trend,
          trade_idea: data.tradeIdea,
          entry_price: data.entryPrice,
          stop_loss: data.stopLoss,
          take_profit: data.takeProfit,
          rr_ratio: data.rrRatio,
          strength: data.strength,
          duration: data.duration,
          analysis_text: data.analysisText,
          risk_warning: data.riskWarning,
          cost: analysisCost,
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      toast.success("Analysis complete!");
      refetchWallet();
      navigate(`/analysis/${analysis.id}`);
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to complete analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout hideNav>
      <Header title="Trade Setup" showBack />

      <div className="px-4 py-4">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step >= 1 ? "gradient-primary text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {step > 1 ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <span className={cn("text-sm", step >= 1 ? "text-foreground" : "text-muted-foreground")}>
              Select Instrument
            </span>
          </div>
          <div className="w-12 h-0.5 bg-border" />
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step >= 2 ? "gradient-primary text-white" : "bg-muted text-muted-foreground"
              )}
            >
              2
            </div>
            <span className={cn("text-sm", step >= 2 ? "text-foreground" : "text-muted-foreground")}>
              Upload Charts
            </span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <Label>Symbol / Instrument</Label>
              <SymbolSelect
                value={symbol}
                onValueChange={setSymbol}
                placeholder="Select an instrument..."
              />
            </div>

            <Button
              className="w-full gradient-primary"
              onClick={() => setStep(2)}
              disabled={!symbol}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Upload Your Charts</h3>
                <ChartUploadGuide />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Use clear images with visible price numbers for the best results.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* 4H Chart */}
                <div>
                  <input
                    type="file"
                    id="chart4h"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setChart4h)}
                  />
                  <label
                    htmlFor="chart4h"
                    className={cn(
                      "flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                      chart4h ? "border-primary bg-primary/5" : "border-border hover:border-primary"
                    )}
                  >
                    {chart4h ? (
                      <Check className="w-6 h-6 text-primary mb-1" />
                    ) : (
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {chart4h ? "Uploaded" : "Upload 4H Chart"}
                    </span>
                  </label>
                </div>

                {/* 15M Chart */}
                <div>
                  <input
                    type="file"
                    id="chart15m"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setChart15m)}
                  />
                  <label
                    htmlFor="chart15m"
                    className={cn(
                      "flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                      chart15m ? "border-primary bg-primary/5" : "border-border hover:border-primary"
                    )}
                  >
                    {chart15m ? (
                      <Check className="w-6 h-6 text-primary mb-1" />
                    ) : (
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {chart15m ? "Uploaded" : "Upload 15M Chart"}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Today's Analyses */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Today's analyses</span>
                <span className="text-sm font-medium">{todayCount}/{dailyLimit}</span>
              </div>
              <Progress value={(todayCount / dailyLimit) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Resets at midnight · Africa/Lagos
              </p>
            </div>

            {/* Trade Focus */}
            <div>
              <Label className="mb-3 block">What's Your Trade Focus?</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={tradeFocus === "scalp" ? "default" : "outline"}
                  className={cn(tradeFocus === "scalp" && "gradient-primary")}
                  onClick={() => setTradeFocus("scalp")}
                >
                  Scalp
                </Button>
                <Button
                  type="button"
                  variant={tradeFocus === "swing" ? "default" : "outline"}
                  className={cn(tradeFocus === "swing" && "gradient-primary")}
                  onClick={() => setTradeFocus("swing")}
                >
                  Swing
                </Button>
              </div>
            </div>

            {/* Balance Check */}
            {wallet && wallet.balance < analysisCost && (
              <Card className="border-warning/50 bg-warning/10">
                <CardContent className="flex items-center gap-3 py-3">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <div>
                    <p className="text-sm font-medium">Insufficient Balance</p>
                    <p className="text-xs text-muted-foreground">
                      You need ${analysisCost} for analysis. Current: ${wallet.balance.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analyze Button */}
            <Button
              className="w-full h-12 text-lg gradient-primary shadow-primary"
              onClick={handleAnalyze}
              disabled={isAnalyzing || (wallet && wallet.balance < analysisCost)}
            >
              {isAnalyzing ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Analyzing...
                </div>
              ) : (
                `Analyze (${analysisCost} credits)`
              )}
            </Button>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center">
              This is not a financial advice and should not be considered as such. Always do your own
              research and consult with a financial advisor before making any trading decisions.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Analyze;
