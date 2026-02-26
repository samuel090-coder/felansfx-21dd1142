import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ApplicationServer,
  importVapidKeys,
  Urgency,
  PushMessageError,
} from "jsr:@negrel/webpush";
import { getVapidKeysAsJwk } from "../_shared/vapid.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let appServer: ApplicationServer | null = null;

async function getAppServer(): Promise<ApplicationServer> {
  if (appServer) return appServer;

  const jwkKeys = getVapidKeysAsJwk();
  if (!jwkKeys) throw new Error("VAPID keys not configured");

  const vapidKeys = await importVapidKeys(jwkKeys);
  appServer = await ApplicationServer.new({
    contactInformation: "mailto:admin@felansfx.com",
    vapidKeys,
  });
  console.log("VAPID server initialized successfully");
  return appServer;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client: uses the caller's JWT for permission checks
    const authHeader = req.headers.get("Authorization");
    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    // Service client: uses service role key, bypasses RLS for DB writes
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is an internal call (from cron/other edge functions) or admin call
    const isInternalCall = req.headers.get("x-internal-key") === supabaseServiceKey;

    if (!isInternalCall) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: authData, error: authError } = await authClient.auth.getUser();
      if (authError || !authData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: isAdmin } = await authClient.rpc("has_role", {
        _role: "admin",
        _user_id: authData.user.id,
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const { userIds, title, message, url } = body;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "Title and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push notifications to ${userIds?.length || "all"} users`);

    // Use SERVICE client (bypasses RLS) for all DB operations
    let query = serviceClient.from("push_subscriptions").select("*");
    if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds);
    }

    const { data: subscriptionsRaw, error: fetchError } = await query;
    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    const subscriptions = (subscriptionsRaw || []) as unknown as SubscriptionRow[];

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, total: 0, message: "No subscribers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dedupe by endpoint
    const uniqueByEndpoint = new Map<string, SubscriptionRow>();
    for (const s of subscriptions) {
      if (!uniqueByEndpoint.has(s.endpoint)) uniqueByEndpoint.set(s.endpoint, s);
    }
    const uniqueSubscriptions = [...uniqueByEndpoint.values()];
    console.log(`Found ${uniqueSubscriptions.length} unique subscriptions`);

    const server = await getAppServer();

    const payloadString = JSON.stringify({
      title,
      body: message,
      url: url || "/",
      icon: "/favicon-512.png",
    });

    let successCount = 0;
    const expiredIds: string[] = [];
    let failedCount = 0;
    const broadcastId = crypto.randomUUID();
    const authErrorByUser = new Map<string, { statusCode: number | null; error: string | null }>();

    for (const sub of uniqueSubscriptions) {
      let statusCode: number | null = null;
      let errorMsg: string | null = null;
      let isGone = false;
      let isAuthError = false;

      try {
        const subscriber = server.subscribe({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        });

        await subscriber.pushTextMessage(payloadString, {
          urgency: Urgency.High,
          ttl: 86400,
        });

        statusCode = 201;
        successCount++;
        console.log(`✅ Push sent to ${sub.endpoint.substring(0, 50)}...`);
      } catch (error: unknown) {
        failedCount++;

        if (error instanceof PushMessageError) {
          errorMsg = error.toString();
          isGone = error.isGone();
          statusCode = error.response?.status || null;
          isAuthError = statusCode === 401 || statusCode === 403;
          console.error(`❌ PushMessageError [${statusCode}] for ${sub.endpoint.substring(0, 50)}...: ${errorMsg}`);
        } else if (error instanceof Error) {
          errorMsg = error.message;
          console.error(`❌ Error for ${sub.endpoint.substring(0, 50)}...: ${errorMsg}`);
        } else {
          errorMsg = "Unknown error";
        }

        if (isGone) expiredIds.push(sub.id);
        if (isAuthError) {
          // 403 from FCM means VAPID mismatch - subscription needs refresh
          expiredIds.push(sub.id);
          authErrorByUser.set(sub.user_id, { statusCode, error: errorMsg });
        }
      }

      // Log delivery result using service client (bypasses RLS)
      try {
        const endpointHost = new URL(sub.endpoint).hostname;
        await serviceClient.from("push_delivery_logs").insert({
          broadcast_id: broadcastId,
          user_id: sub.user_id,
          subscription_id: sub.id,
          title,
          message,
          status_code: statusCode,
          error: errorMsg,
          is_gone: isGone,
          is_auth_error: isAuthError,
          endpoint_host: endpointHost,
        });
      } catch (logError) {
        console.error("Failed to log delivery:", logError);
      }
    }

    // Create in-app notifications using service client
    const uniqueUserIds = [...new Set(uniqueSubscriptions.map((s) => s.user_id))];
    await serviceClient.from("notifications").insert(
      uniqueUserIds.map((userId: string) => ({
        user_id: userId,
        title,
        message,
        type: "info",
        action_url: url || "/",
      }))
    );

    // Clean up expired/invalid subscriptions
    if (expiredIds.length > 0) {
      const uniqueExpired = [...new Set(expiredIds)];
      console.log(`🧹 Removing ${uniqueExpired.length} expired/invalid subscriptions`);
      await serviceClient.from("push_subscriptions").delete().in("id", uniqueExpired);
    }

    // Flag users for resubscribe
    if (authErrorByUser.size > 0) {
      const nowIso = new Date().toISOString();
      const rows = [...authErrorByUser.entries()].map(([userId, v]) => ({
        user_id: userId,
        reason: "push_auth_error",
        last_status_code: v.statusCode,
        last_error: v.error,
        updated_at: nowIso,
      }));

      const { error: flagError } = await serviceClient
        .from("push_resubscribe_flags")
        .upsert(rows, { onConflict: "user_id" });

      if (flagError) console.error("Failed to set resubscribe flags:", flagError);
      else console.log(`🔄 Flagged ${rows.length} user(s) for push resubscribe`);
    }

    console.log(`📊 Push results: ${successCount} sent, ${failedCount} failed, ${expiredIds.length} cleaned`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: uniqueSubscriptions.length,
        users: uniqueUserIds.length,
        failed: failedCount,
        expired: expiredIds.length,
        needs_refresh: authErrorByUser.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in send-push function:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
