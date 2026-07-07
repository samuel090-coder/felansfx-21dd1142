import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Called by the client right after the Paystack overlay reports success.
// Verifies the transaction with Paystack and fulfils it (idempotent).
// Acts as an instant path + backup to the webhook.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing authorization header" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { reference } = await req.json().catch(() => ({}));
    if (!reference || typeof reference !== "string") {
      return jsonResponse({ error: "Missing reference" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Ensure the intent belongs to this user
    const { data: intent } = await admin
      .from("payment_intents")
      .select("id, user_id, status")
      .eq("reference", reference)
      .maybeSingle();
    if (!intent || intent.user_id !== user.id) {
      return jsonResponse({ error: "Intent not found" }, 404);
    }
    if (intent.status === "success") {
      return jsonResponse({ status: "success" });
    }

    // Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.status || verifyData.data?.status !== "success") {
      return jsonResponse({ status: "pending" });
    }

    const { error: rpcErr } = await admin.rpc("complete_payment_intent", { p_reference: reference });
    if (rpcErr) {
      console.error("complete_payment_intent error:", rpcErr);
      return jsonResponse({ error: "Fulfilment failed" }, 500);
    }

    return jsonResponse({ status: "success" });
  } catch (e) {
    console.error("paystack-verify error:", e);
    const msg = e instanceof Error ? e.message : "Internal error";
    return jsonResponse({ error: msg }, 500);
  }
});
