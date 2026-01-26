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
    "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// Initialize application server once
let appServer: ApplicationServer | null = null;

async function getAppServer(): Promise<ApplicationServer> {
  if (appServer) return appServer;

  // Get VAPID keys from env and convert to JWK
  const jwkKeys = getVapidKeysAsJwk();
  if (!jwkKeys) {
    throw new Error("VAPID keys not configured");
  }

  try {
    // Import VAPID keys in JWK format
    const vapidKeys = await importVapidKeys(jwkKeys);

    // Create application server
    appServer = await ApplicationServer.new({
      contactInformation: "mailto:admin@felansfx.com",
      vapidKeys,
    });

    console.log("VAPID server initialized successfully");
    return appServer;
  } catch (error) {
    console.error("Failed to initialize VAPID:", error);
    throw new Error("Failed to initialize push notifications");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");

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

    // Dedupe by endpoint (extra safety)
    const uniqueByEndpoint = new Map<string, SubscriptionRow>();
    for (const s of subscriptions) {
      if (!uniqueByEndpoint.has(s.endpoint)) uniqueByEndpoint.set(s.endpoint, s);
    }
    const uniqueSubscriptions = [...uniqueByEndpoint.values()];

    console.log(`Found ${uniqueSubscriptions.length} unique subscriptions`);

    // Get the application server
    const server = await getAppServer();

    const payload: PushPayload = {
      title,
      body: message,
      url: url || "/",
      icon: "/favicon-512.png",
    };
    const payloadString = JSON.stringify(payload);

    let successCount = 0;
    const expiredIds: string[] = [];
    let failedCount = 0;

    for (const sub of uniqueSubscriptions) {
      try {
        // Create a subscriber using the library
        const subscriber = server.subscribe({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        });

        // Send push message
        await subscriber.pushTextMessage(payloadString, {
          urgency: Urgency.High,
          ttl: 86400,
        });

        successCount++;
        console.log(`Push sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
      } catch (error: unknown) {
        failedCount++;
        
        // Use PushMessageError properly for detailed logging
        let errorDetails = "Unknown error";
        let isExpired = false;
        
        if (error instanceof PushMessageError) {
          errorDetails = error.toString();
          isExpired = error.isGone();
          console.error(`PushMessageError for ${sub.endpoint.substring(0, 50)}...: ${errorDetails}`);
          if (error.response) {
            console.error(`Response status: ${error.response.status}`);
          }
        } else if (error instanceof Error) {
          errorDetails = error.message || error.toString();
          console.error(`Error for ${sub.endpoint.substring(0, 50)}...: ${errorDetails}`);
        } else {
          console.error(`Unknown error type for ${sub.endpoint.substring(0, 50)}...:`, error);
        }
          
        if (isExpired) {
          console.log(`Subscription ${sub.id} is expired/gone, marking for cleanup`);
          expiredIds.push(sub.id);
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
    if (expiredIds.length > 0) {
      console.log(`Removing ${expiredIds.length} expired subscriptions`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredIds);
    }

    console.log(`Push notifications sent: ${successCount}/${uniqueSubscriptions.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: uniqueSubscriptions.length,
        users: uniqueUserIds.length,
        failed: failedCount,
        expired: expiredIds.length
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
