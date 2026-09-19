import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { storage } from "@/lib/platform";

export const REDIRECT_AFTER_AUTH_KEY = "redirect_after_auth";

/**
 * Single callback screen for email confirmations and social sign-in.
 * Works identically in the browser and inside a native shell because the
 * intended destination is stored locally instead of encoded in the URL.
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const finish = (target: string) => {
      if (cancelled) return;
      storage.remove(REDIRECT_AFTER_AUTH_KEY);
      navigate(target, { replace: true });
    };

    supabase.auth.getSession().then(({ data }) => {
      const target = storage.get(REDIRECT_AFTER_AUTH_KEY) || "/";
      finish(data.session ? target : "/auth");
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
};

export default AuthCallback;
