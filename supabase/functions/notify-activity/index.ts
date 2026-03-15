import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushNotifications } from "../_shared/push-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { type, target_user_id, amount, note, room_name } = await req.json();
    if (!type || !target_user_id) throw new Error("type and target_user_id required");

    // Get sender profile
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: senderProfile } = await adminClient
      .from("profiles")
      .select("full_name, display_id")
      .eq("user_id", user.id)
      .single();

    const senderName = senderProfile?.full_name || senderProfile?.display_id || "Someone";

    let title = "";
    let message = "";
    let url = "/";

    switch (type) {
      case "fund_sent":
        title = "💸 You Received Funds!";
        message = `${senderName} sent you ₦${Number(amount).toLocaleString()}${note ? ` — "${note}"` : ""}`;
        url = "/send-funds";
        break;
      case "money_request":
        title = "💰 Money Request";
        message = `${senderName} is requesting ₦${Number(amount).toLocaleString()} from you${note ? ` — "${note}"` : ""}`;
        url = "/send-funds";
        break;
      case "money_request_accepted":
        title = "✅ Request Accepted";
        message = `${senderName} sent you ₦${Number(amount).toLocaleString()}`;
        url = "/send-funds";
        break;
      case "money_request_declined":
        title = "❌ Request Declined";
        message = `${senderName} declined your money request of ₦${Number(amount).toLocaleString()}`;
        url = "/send-funds";
        break;
      case "room_join_request":
        title = "👋 Join Request";
        message = `${senderName} wants to join ${room_name || "your room"}`;
        url = "/chat-rooms";
        break;
      case "room_join_approved":
        title = "✅ Join Approved";
        message = `Your request to join ${room_name || "a room"} was approved!`;
        url = "/chat-rooms";
        break;
      case "user_reported":
        title = "⚠️ User Report Filed";
        message = `A user report has been submitted for review.`;
        url = "/admin";
        break;
      default:
        title = "📱 FelansFX";
        message = note || "You have a new notification";
    }

    await sendPushNotifications({
      userIds: [target_user_id],
      title,
      message,
      url,
      type: type.includes("declined") ? "warning" : "info",
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
