import { useState, useEffect } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

interface DailyStreakSettings {
  id: string;
  title: string;
  subtitle: string;
  highlight_text: string | null;
  unlock_price: number;
  features: string[];
  is_active: boolean;
}

export const DailyStreakManager = () => {
  const [settings, setSettings] = useState<DailyStreakSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_streak_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const featuresArray = Array.isArray(data.features)
          ? (data.features as unknown as string[]).map(String)
          : [];
        setSettings({
          ...data,
          features: featuresArray,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("daily_streak_settings")
        .update({
          title: settings.title,
          subtitle: settings.subtitle,
          highlight_text: settings.highlight_text,
          unlock_price: settings.unlock_price,
          features: settings.features,
          is_active: settings.is_active,
        })
        .eq("id", settings.id);

      if (error) throw error;
      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddFeature = () => {
    if (!newFeature.trim() || !settings) return;
    setSettings({
      ...settings,
      features: [...settings.features, newFeature.trim()],
    });
    setNewFeature("");
  };

  const handleRemoveFeature = (index: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      features: settings.features.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No daily streak settings found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Daily Streak Settings</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="is-active" className="text-sm">Active</Label>
            <Switch
              id="is-active"
              checked={settings.is_active}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, is_active: checked })
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={settings.title}
            onChange={(e) => setSettings({ ...settings, title: e.target.value })}
            placeholder="Unlock Curated Daily Analysis"
          />
        </div>

        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Textarea
            value={settings.subtitle}
            onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
            placeholder="Access high-conviction setups..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Highlight Text</Label>
          <Input
            value={settings.highlight_text || ""}
            onChange={(e) => setSettings({ ...settings, highlight_text: e.target.value })}
            placeholder="Pro members act faster, risk better..."
          />
        </div>

        <div className="space-y-2">
          <Label>Unlock Price (₦)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
            <Input
              type="number"
              className="pl-8"
              placeholder="Enter amount"
              value={settings.unlock_price === 0 ? "" : settings.unlock_price}
              onChange={(e) =>
                setSettings({ ...settings, unlock_price: e.target.value === "" ? 0 : parseFloat(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Features</Label>
          <div className="space-y-2">
            {settings.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={feature}
                  onChange={(e) => {
                    const newFeatures = [...settings.features];
                    newFeatures[index] = e.target.value;
                    setSettings({ ...settings, features: newFeatures });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive shrink-0"
                  onClick={() => handleRemoveFeature(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add new feature..."
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddFeature()}
              />
              <Button variant="outline" size="icon" onClick={handleAddFeature}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <Button className="w-full gradient-primary" onClick={handleSave} disabled={saving}>
          {saving ? <LoadingSpinner size="sm" /> : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
