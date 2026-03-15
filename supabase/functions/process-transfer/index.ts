import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushNotifications } from "../_shared/push-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { receiver_id, amount, note } = await req.json();
    if (!receiver_id || !amount || amount <= 0) throw new Error("Invalid params");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify receiver exists
    const { data: receiverWallet } = await adminClient.from("wallets").select("id, balance").eq("user_id", receiver_id).maybeSingle();
    if (!receiverWallet) throw new Error("Receiver wallet not found");

    // Credit receiver using service function
    await adminClient.rpc("credit_user_wallet_service", {
      p_user_id: receiver_id,
      p_amount: amount,
    });

    // Send push notification to receiver
    try {
      const { data: senderProfile } = await adminClient
        .from("profiles")
        .select("full_name, display_id")
        .eq("user_id", user.id)
        .single();

      const senderName = senderProfile?.full_name || senderProfile?.display_id || "Someone";

      await sendPushNotifications({
        userIds: [receiver_id],
        title: "💸 You Received Funds!",
        message: `${senderName} sent you ₦${Number(amount).toLocaleString()}${note ? ` — "${note}"` : ""}`,
        url: "/send-funds",
        type: "success",
      });
    } catch (e) {
      console.error("Push notification error:", e);
    }

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
