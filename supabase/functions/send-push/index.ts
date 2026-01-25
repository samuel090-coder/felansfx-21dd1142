import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "https://esm.sh/web-push@3.6.7?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

type SubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:no-reply@lovable.app";

    const authHeader = req.headers.get("Authorization");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // Require auth + admin role (prevents anyone from broadcasting)
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _role: "admin",
      _user_id: authData.user.id,
    });
    if (roleError || !isAdmin) {
      console.error("Role check error:", roleError);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Fetch push subscriptions
    let query = supabase.from("push_subscriptions").select("*");
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
        JSON.stringify({ success: true, sent: 0, message: "No subscribers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dedupe by endpoint (some browsers can re-register and create duplicates)
    const uniqueByEndpoint = new Map<string, SubscriptionRow>();
    for (const s of subscriptions) {
      if (!uniqueByEndpoint.has(s.endpoint)) uniqueByEndpoint.set(s.endpoint, s);
    }
    const uniqueSubscriptions = [...uniqueByEndpoint.values()];

    console.log(`Found ${uniqueSubscriptions.length} unique subscriptions`);

    const payload: PushPayload = {
      title,
      body: message,
      url: url || "/",
      icon: "/favicon.ico",
    };

    let successCount = 0;
    const expiredEndpoints: string[] = [];
    let failedCount = 0;

    for (const sub of uniqueSubscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload),
          {
            vapidDetails: {
              subject: vapidSubject,
              publicKey: vapidPublicKey,
              privateKey: vapidPrivateKey,
            },
            TTL: 86400,
            urgency: "high",
          }
        );

        successCount++;
        console.log(`Push sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
      } catch (error) {
        const statusCode = (error as any)?.statusCode;
        failedCount++;
        console.error(
          `Error sending push to ${sub.endpoint.substring(0, 50)}... (status=${statusCode ?? "unknown"}):`,
          error
        );

        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or invalid
          expiredEndpoints.push(sub.endpoint);
        }
      }
    }

    // Also create in-app notifications for all targeted users
    const uniqueUserIds = [...new Set(uniqueSubscriptions.map((s) => s.user_id))];
    const notifications = uniqueUserIds.map((userId: string) => ({
      user_id: userId,
      title,
      message,
      type: "info" as const,
      action_url: url || "/",
    }));

    const { error: notifError } = await supabase.from("notifications").insert(notifications);
    if (notifError) {
      console.error("Error creating in-app notifications:", notifError);
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      console.log(`Removing ${expiredEndpoints.length} expired subscriptions`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    console.log(`Push notifications sent: ${successCount}/${uniqueSubscriptions.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: uniqueSubscriptions.length,
        users: uniqueUserIds.length,
        failed: failedCount,
        expired: expiredEndpoints.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-push function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
