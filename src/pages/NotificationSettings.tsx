import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, ChevronLeft, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const ALL_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "NAS100", "AUDUSD", "USDCHF", "USDCAD", "NZDUSD", "EURGBP"];

interface Preferences {
  morning_brief: boolean;
  midday_opportunities: boolean;
  evening_recap: boolean;
  preferred_pairs: string[];
}

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>({
    morning_brief: true,
    midday_opportunities: true,
    evening_recap: true,
    preferred_pairs: ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "NAS100"],
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          morning_brief: data.morning_brief,
          midday_opportunities: data.midday_opportunities,
          evening_recap: data.evening_recap,
          preferred_pairs: data.preferred_pairs || [],
        });
      }
      setLoaded(true);
    };
    load();
  }, [user]);

  const togglePair = (pair: string) => {
    setPrefs((p) => ({
      ...p,
      preferred_pairs: p.preferred_pairs.includes(pair)
        ? p.preferred_pairs.filter((x) => x !== pair)
        : [...p.preferred_pairs, pair],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("notification_preferences").upsert(
        {
          user_id: user.id,
          ...prefs,
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      toast.success("Notification preferences saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !loaded) return <LoadingScreen />;
  if (!user) return null;

  const timeSlots = [
    {
      key: "morning_brief" as const,
      label: "🌅 Morning Brief",
      time: "8:00 AM WAT",
      desc: "Daily market outlook, key levels, economic calendar",
    },
    {
      key: "midday_opportunities" as const,
      label: "🔥 Midday Opportunities",
      time: "2:00 PM WAT",
      desc: "Live setups, fresh signals, best entries",
    },
    {
      key: "evening_recap" as const,
      label: "🌙 Evening Recap",
      time: "9:30 PM WAT",
      desc: "Daily results, lessons learned, tomorrow's watchlist",
    },
  ];

  return (
    <AppLayout>
      <div className="px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-display font-bold">Notification Settings</h1>
        </div>

        {/* Daily Notification Times */}
        <Card className="border-0 shadow-md mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Daily AI Signals Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {timeSlots.map((slot) => (
              <div key={slot.key} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex-1">
                  <p className="font-medium text-sm">{slot.label}</p>
                  <p className="text-xs text-muted-foreground">{slot.time}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{slot.desc}</p>
                </div>
                <Switch
                  checked={prefs[slot.key]}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [slot.key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Preferred Pairs */}
        <Card className="border-0 shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-base">Preferred Pairs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Select the pairs you want mentioned in your daily signals
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_PAIRS.map((pair) => (
                <Badge
                  key={pair}
                  variant={prefs.preferred_pairs.includes(pair) ? "default" : "outline"}
                  className="cursor-pointer text-xs px-3 py-1.5"
                  onClick={() => togglePair(pair)}
                >
                  {pair}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button className="w-full gradient-primary" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </AppLayout>
  );
};

export default NotificationSettings;
