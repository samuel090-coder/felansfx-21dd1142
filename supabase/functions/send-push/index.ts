import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isFcmConfigured, sendFcmToToken } from "../_shared/fcm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TokenRow = { id: string; user_id: string; token: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const isInternalCall = req.headers.get("x-internal-key") === supabaseServiceKey;

    if (!isInternalCall) {
      if (!authHeader) return json({ error: "Unauthorized" }, 401);
      const { data: authData, error: authError } = await authClient.auth.getUser();
      if (authError || !authData?.user) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await authClient.rpc("has_role", {
        _role: "admin",
        _user_id: authData.user.id,
      });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const { userIds, title, message, url } = body as {
      userIds?: string[];
      title?: string;
      message?: string;
      url?: string;
    };

    if (typeof title !== "string" || !title.trim() || typeof message !== "string" || !message.trim()) {
      return json({ error: "Title and message are required" }, 400);
    }
    if (title.length > 120 || message.length > 1000) {
      return json({ error: "Title or message too long" }, 400);
    }
    if (userIds !== undefined && (!Array.isArray(userIds) || !userIds.every((u) => typeof u === "string"))) {
      return json({ error: "userIds must be an array of ids" }, 400);
    }

    if (!isFcmConfigured()) {
      return json({ error: "Firebase Cloud Messaging is not configured" }, 500);
    }

    let query = serviceClient.from("fcm_tokens").select("id, user_id, token");
    if (userIds && userIds.length > 0) query = query.in("user_id", userIds);
    const { data: tokensRaw, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    const tokens = (tokensRaw || []) as TokenRow[];
    const uniqueUserIds = [...new Set(tokens.map((t) => t.user_id))];

    // In-app notifications for targeted users (or all token holders when broadcasting)
    const inAppTargets = userIds && userIds.length > 0 ? userIds : uniqueUserIds;
    if (inAppTargets.length > 0) {
      await serviceClient.from("notifications").insert(
        inAppTargets.map((userId) => ({
          user_id: userId,
          title,
          message,
          type: "info",
          action_url: url || "/",
        }))
      );
    }

    if (tokens.length === 0) {
      return json({ success: true, sent: 0, total: 0, users: 0, failed: 0, expired: 0, message: "No devices" });
    }

    const broadcastId = crypto.randomUUID();
    let sent = 0;
    let failed = 0;
    const staleIds: string[] = [];
    const logs: Record<string, unknown>[] = [];

    const CONCURRENCY = 10;
    for (let i = 0; i < tokens.length; i += CONCURRENCY) {
      const batch = tokens.slice(i, i + CONCURRENCY);
      const outcomes = await Promise.all(
        batch.map((t) =>
          sendFcmToToken(t.token, { title, body: message, url: url || "/" }).catch((e) => ({
            ok: false as const,
            status: 0,
            body: String(e),
            stale: false,
          }))
        )
      );
      outcomes.forEach((o, idx) => {
        const t = batch[idx];
        if (o.ok) sent++;
        else {
          failed++;
          if (o.stale) staleIds.push(t.id);
        }
        logs.push({
          broadcast_id: broadcastId,
          user_id: t.user_id,
          subscription_id: null,
          title,
          message,
          status_code: o.ok ? 200 : o.status,
          error: o.ok ? null : o.body.slice(0, 500),
          is_gone: !o.ok && o.stale,
          is_auth_error: !o.ok && (o.status === 401 || o.status === 403),
          endpoint_host: "fcm.googleapis.com",
        });
      });
    }

    if (logs.length > 0) {
      const { error: logErr } = await serviceClient.from("push_delivery_logs").insert(logs);
      if (logErr) console.error("Failed to write delivery logs:", logErr);
    }

    if (staleIds.length > 0) {
      await serviceClient.from("fcm_tokens").delete().in("id", staleIds);
    }

    console.log(`📊 FCM results: ${sent} sent, ${failed} failed, ${staleIds.length} stale removed`);

    return json({
      success: true,
      sent,
      total: tokens.length,
      users: uniqueUserIds.length,
      failed,
      expired: staleIds.length,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in send-push function:", err);
    return json({ error: err.message }, 500);
  }
});
