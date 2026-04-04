import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

const BG_STORAGE_KEY = "user_bg_image";

export const useBackgroundImage = () => {
  const { user } = useAuth();
  const [bgUrl, setBgUrl] = useState<string | null>(() => localStorage.getItem(BG_STORAGE_KEY));
  const [uploading, setUploading] = useState(false);

  // Load from profile on login
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("bg_image_url")
        .eq("user_id", user.id)
        .maybeSingle();
      const url = (data as any)?.bg_image_url || null;
      setBgUrl(url);
      if (url) localStorage.setItem(BG_STORAGE_KEY, url);
      else localStorage.removeItem(BG_STORAGE_KEY);
    };
    load();
  }, [user]);

  const uploadBackground = useCallback(async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      // Compress if needed
      const path = `backgrounds/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("uploads")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      await supabase
        .from("profiles")
        .update({ bg_image_url: publicUrl } as any)
        .eq("user_id", user.id);

      setBgUrl(publicUrl);
      localStorage.setItem(BG_STORAGE_KEY, publicUrl);
      return publicUrl;
    } finally {
      setUploading(false);
    }
  }, [user]);

  const removeBackground = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ bg_image_url: null } as any)
      .eq("user_id", user.id);
    setBgUrl(null);
    localStorage.removeItem(BG_STORAGE_KEY);
  }, [user]);

  const selectPreset = useCallback(async (css: string) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ bg_image_url: css } as any)
      .eq("user_id", user.id);
    setBgUrl(css);
    localStorage.setItem(BG_STORAGE_KEY, css);
  }, [user]);

  return { bgUrl, uploading, uploadBackground, removeBackground, selectPreset };
};
