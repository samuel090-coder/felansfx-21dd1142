import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ApplicationServer,
  importVapidKeys,
} from "jsr:@negrel/webpush";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper to convert bytes to base64url
function base64UrlEncode(data: Uint8Array): string {
  const binary = String.fromCharCode(...data);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

interface PushRequest {
  action: "get-vapid-key" | "send";
  userId?: string;
  title?: string;
  body?: string;
  url?: string;
}

// Cached application server key (base64url encoded public key)
let cachedPublicKey: string | null = null;
let appServer: ApplicationServer | null = null;

async function getAppServer(): Promise<ApplicationServer | null> {
  if (appServer) return appServer;

  const vapidKeysJson = Deno.env.get("VAPID_KEYS_JSON");
  if (!vapidKeysJson) {
    console.error("VAPID_KEYS_JSON not configured");
    return null;
  }

  try {
    const exportedKeys = JSON.parse(vapidKeysJson);
    const vapidKeys = await importVapidKeys(exportedKeys);
    
    appServer = await ApplicationServer.new({
      contactInformation: "mailto:admin@felansfx.com",
      vapidKeys,
    });
    
    return appServer;
  } catch (error) {
    console.error("Failed to initialize VAPID:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: PushRequest = await req.json();

    // Return VAPID public key for client subscription
    if (body.action === "get-vapid-key") {
      const server = await getAppServer();
      
      if (!server) {
        return new Response(
          JSON.stringify({ error: "Push notifications not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the public key in base64url format for the browser
      if (!cachedPublicKey) {
        // Get the raw public key and convert to base64url
        const publicKeyRaw = await server.getVapidPublicKeyRaw();
        cachedPublicKey = base64UrlEncode(new Uint8Array(publicKeyRaw));
      }

      return new Response(
        JSON.stringify({ publicKey: cachedPublicKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For push sending, we'll create an in-app notification instead
    // Actual push is handled by send-push or deposit-notification functions
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
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in push-notifications function:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
