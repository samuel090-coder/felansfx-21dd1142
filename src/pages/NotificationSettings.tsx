import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Save, ShieldCheck, Star, TrendingUp, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FintechCard } from "@/components/ui/fintech";

const ALL_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "NAS100", "AUDUSD", "USDCHF", "USDCAD", "NZDUSD", "EURGBP", "USOIL"];

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
      const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();
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
      preferred_pairs: p.preferred_pairs.includes(pair) ? p.preferred_pairs.filter((x) => x !== pair) : [...p.preferred_pairs, pair],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, ...prefs }, { onConflict: "user_id" });
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
    { key: "morning_brief" as const, label: "Morning Brief ☀️", time: "8:00 AM WAT", desc: ["Market outlook", "Key levels", "Economic calendar"], icon: Bell },
    { key: "midday_opportunities" as const, label: "Midday Opportunities 🔥", time: "2:00 PM WAT", desc: ["Live setups", "Breakout signals", "Best entries"], icon: TrendingUp },
    { key: "evening_recap" as const, label: "Evening Recap 🌙", time: "9:30 PM WAT", desc: ["Daily results", "Lessons learned", "Tomorrow's watchlist"], icon: ShieldCheck },
  ];

  return (
    <AppLayout>
      <div className="bg-fx-app">
        <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-5 safe-area-top">
          <header className="mb-5 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-[2.2rem] font-bold text-white">AI Signals Center</h1>
                <p className="text-base text-white/58">Customize how and when AI delivers signals</p>
              </div>
            </div>
            <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">How it works</button>
          </header>

          <FintechCard className="relative mb-5 overflow-hidden p-5">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(19,172,165,0.22),rgba(20,44,124,0.22))]" />
            <div className="relative z-10 grid grid-cols-[80px_1fr_auto] items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-[linear-gradient(180deg,rgba(39,232,221,1),rgba(19,175,215,1))] text-white shadow-primary">
                <TrendingUp className="h-9 w-9" />
              </div>
              <div className="grid grid-cols-3 gap-4 text-white">
                <div>
                  <p className="text-sm text-white/56">Signals Status</p>
                  <p className="mt-1 text-[1.7rem] font-bold text-primary">Active</p>
                </div>
                <div>
                  <p className="text-sm text-white/56">Today</p>
                  <p className="mt-1 text-[1.7rem] font-bold">8</p>
                  <p className="text-sm text-white/45">Signals Sent</p>
                </div>
                <div>
                  <p className="text-sm text-white/56">Win Rate</p>
                  <p className="mt-1 text-[1.7rem] font-bold text-primary">84%</p>
                  <p className="text-sm text-white/45">Last 30 Days</p>
                </div>
              </div>
              <button className="rounded-[22px] border border-primary/20 bg-primary/10 px-4 py-3 text-left text-white">
                <p className="text-sm text-white/56">Preferred Pairs</p>
                <p className="text-[1.6rem] font-bold">{prefs.preferred_pairs.length}</p>
                <p className="text-sm text-white/45">Selected</p>
              </button>
            </div>
          </FintechCard>

          <FintechCard className="mb-5 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">1</span>
                <h2 className="text-[1.9rem] font-bold text-white">Daily Signals Schedule</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base text-white/56">All Notifications</span>
                <Switch checked={prefs.morning_brief && prefs.midday_opportunities && prefs.evening_recap} onCheckedChange={(value) => setPrefs((prev) => ({ ...prev, morning_brief: value, midday_opportunities: value, evening_recap: value }))} />
              </div>
            </div>
            <div className="space-y-4">
              {timeSlots.map((slot) => (
                <div key={slot.key} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="grid grid-cols-[76px_1fr_auto] items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-primary">
                      <slot.icon className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-[1.7rem] font-bold text-white">{slot.label}</p>
                      <p className="mt-1 text-[1.3rem] text-primary">{slot.time}</p>
                      <div className="mt-3 grid grid-cols-1 gap-1 text-sm text-white/56">
                        {slot.desc.map((text) => <p key={text}>✓ {text}</p>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch checked={prefs[slot.key]} onCheckedChange={(value) => setPrefs((p) => ({ ...p, [slot.key]: value }))} />
                      <ArrowLeft className="h-5 w-5 rotate-180 text-white/45" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FintechCard>

          <div className="mb-5 grid grid-cols-2 gap-4">
            <FintechCard className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">2</span>
                  <h3 className="text-[1.7rem] font-bold text-white">Preferred Pairs</h3>
                </div>
                <button className="text-base text-white/55">Manage</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {ALL_PAIRS.map((pair) => {
                  const active = prefs.preferred_pairs.includes(pair);
                  return (
                    <button key={pair} type="button" onClick={() => togglePair(pair)} className={cn('rounded-full border px-4 py-3 text-base', active ? 'border-primary bg-primary/12 text-primary' : 'border-white/10 bg-white/[0.03] text-white/65')}>
                      {pair} {active ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 flex items-center justify-between text-base text-white/46"><span>Selected {prefs.preferred_pairs.length} / 12 pairs</span> <span className="flex items-center gap-1"><Star className="h-4 w-4 text-warning" /> Popular pairs</span></p>
            </FintechCard>

            <FintechCard className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">3</span>
                <h3 className="text-[1.7rem] font-bold text-white">Signal Preferences</h3>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-white">
                    <p className="text-lg font-medium">Minimum Confidence</p>
                    <ShieldCheck className="h-4 w-4 text-white/35" />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[60, 70, 80, 90].map((value) => (
                      <button key={value} className={cn('rounded-full border px-3 py-3 text-base', value === 80 ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/[0.03] text-white/55')}>{value}%</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-white">
                    <p className="text-lg font-medium">Signal Risk Level</p>
                    <ShieldCheck className="h-4 w-4 text-white/35" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['Conservative', 'Balanced', 'Aggressive'].map((value) => (
                      <button key={value} className={cn('rounded-2xl border px-3 py-4 text-base', value === 'Balanced' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/[0.03] text-white/55')}>{value}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-lg font-medium text-white">Delivery Channels</p>
                  <div className="space-y-3">
                    {[['Push Notifications', true], ['In-App Alerts', true], ['Email Alerts', true], ['WhatsApp Alerts', false]].map(([label, active]) => (
                      <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-base text-white">{label}</p>
                        <Switch checked={active} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FintechCard>
          </div>

          <FintechCard className="mb-5 p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">4</span>
              <h3 className="text-[1.7rem] font-bold text-white">AI Signal Types</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['Trend Continuation', 'Breakout Alerts', 'Reversal Signals', 'High Impact News', 'Support & Resistance', 'Market Sentiment'].map((label) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-base text-white">
                  <Zap className="mx-auto mb-2 h-6 w-6 text-primary" />
                  <p>{label}</p>
                </div>
              ))}
            </div>
          </FintechCard>

          <Button className="h-16 w-full rounded-2xl gradient-primary text-[1.9rem] font-semibold shadow-primary" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-5 w-5" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
          <p className="mt-4 text-center text-base text-white/38">Your data is secure and never shared with third parties.</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default NotificationSettings;
