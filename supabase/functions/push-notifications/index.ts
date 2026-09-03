import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isFcmConfigured } from "../_shared/fcm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface PushRequest {
  action: "status" | "send";
  userId?: string;
  title?: string;
  body?: string;
  url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as PushRequest;

    // Report whether FCM is wired up (admin diagnostics)
    if (body.action === "status") {
      return json({ provider: "fcm", configured: isFcmConfigured() });
    }

    // Creates an in-app notification for a single user (admin only)
    if (body.action === "send" && body.userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);

      const authClient = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData } = await authClient.auth.getUser();
      if (!authData?.user) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await authClient.rpc("has_role", {
        _role: "admin",
        _user_id: authData.user.id,
      });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { error } = await supabase.from("notifications").insert({
        user_id: body.userId,
        title: (body.title || "Notification").slice(0, 120),
        message: (body.body || "").slice(0, 1000),
        type: "info",
        action_url: body.url || "/",
      });
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in push-notifications function:", err);
    return json({ error: err.message }, 500);
  }
});
