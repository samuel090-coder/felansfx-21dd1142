import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppSettings {
  site_name: string;
  analysis_cost: string;
  min_deposit: string;
  max_deposit: string;
  first_deposit_bonus: string;
  daily_analysis_limit: string;
}

const defaultSettings: AppSettings = {
  site_name: "Felans FX",
  analysis_cost: "5",
  min_deposit: "5000",
  max_deposit: "500000",
  first_deposit_bonus: "0",
  daily_analysis_limit: "4",
};

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value");

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((item) => {
        settingsMap[item.key] = item.value;
      });

      setSettings({
        ...defaultSettings,
        ...settingsMap,
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Realtime listener for admin setting changes
    const channel = supabase
      .channel("app-settings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  return { settings, loading, refetch: fetchSettings };
};
