import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscribers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    const payload: PushPayload = {
      title,
      body: message,
      url: url || "/",
      icon: "/favicon.ico",
    };

    // Send push to each subscription using simple POST request
    // The service worker will handle displaying the notification
    let successCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        // For Web Push, we need to send to the push service endpoint
        // The endpoint is provided by the browser's push service
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "TTL": "86400",
            "Urgency": "high",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok || response.status === 201) {
          successCount++;
          console.log(`Push sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
        } else {
          console.error(`Push failed for ${sub.endpoint.substring(0, 50)}...: ${response.status}`);
          if (response.status === 404 || response.status === 410) {
            // Subscription expired or invalid
            failedEndpoints.push(sub.endpoint);
          }
        }
      } catch (error) {
        console.error(`Error sending push to ${sub.endpoint.substring(0, 50)}...:`, error);
      }
    }

    // Also create in-app notifications for all targeted users
    const uniqueUserIds = [...new Set(subscriptions.map((s: any) => s.user_id))];
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
    if (failedEndpoints.length > 0) {
      console.log(`Removing ${failedEndpoints.length} expired subscriptions`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
    }

    console.log(`Push notifications sent: ${successCount}/${subscriptions.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: subscriptions.length,
        failed: failedEndpoints.length
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
