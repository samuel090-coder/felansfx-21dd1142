import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  action: "get-vapid-key" | "send";
  userId?: string;
  title?: string;
  body?: string;
  url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPublicKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PushRequest = await req.json();

    // Return VAPID public key for client subscription
    if (body.action === "get-vapid-key") {
      return new Response(
        JSON.stringify({ publicKey: vapidPublicKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For push sending, we'll create an in-app notification instead
    // Web Push requires a library that's complex to set up in Deno
    // The browser notification API will handle showing the notification
    if (body.action === "send" && body.userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Create in-app notification which will trigger browser notification
      // via the realtime subscription
      const { error } = await supabase.from("notifications").insert({
        user_id: body.userId,
        title: body.title || "Notification",
        message: body.body || "",
        type: "info",
        action_url: body.url || "/",
      });

      if (error) {
        console.error("Error creating notification:", error);
        throw error;
      }

      console.log("Notification created for user:", body.userId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in push-notifications function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
