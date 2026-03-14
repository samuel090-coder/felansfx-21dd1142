import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Verify the calling user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { receiver_id, amount } = await req.json();
    if (!receiver_id || !amount || amount <= 0) throw new Error("Invalid params");

    // Use service role to credit receiver
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify receiver exists
    const { data: receiverWallet } = await adminClient.from("wallets").select("id").eq("user_id", receiver_id).maybeSingle();
    if (!receiverWallet) throw new Error("Receiver wallet not found");

    // Credit receiver
    const { error: creditErr } = await adminClient.from("wallets").update({
      balance: undefined // We need to use rpc or raw update
    }).eq("user_id", receiver_id);

    // Actually use raw SQL increment via rpc-like approach
    const { error } = await adminClient.rpc("credit_user_wallet_service", {
      p_user_id: receiver_id, p_amount: amount,
    });

    // If the function doesn't exist, do it manually
    if (error) {
      // Direct update with increment
      const { data: w } = await adminClient.from("wallets").select("balance").eq("user_id", receiver_id).single();
      if (w) {
        await adminClient.from("wallets").update({ balance: w.balance + amount, updated_at: new Date().toISOString() }).eq("user_id", receiver_id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
