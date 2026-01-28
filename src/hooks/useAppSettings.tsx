import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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
  min_deposit: "10",
  max_deposit: "1000",
  first_deposit_bonus: "0",
  daily_analysis_limit: "4",
};

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
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
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, refetch: fetchSettings };
};
