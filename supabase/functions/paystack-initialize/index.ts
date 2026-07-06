import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Purpose = "deposit" | "app_access" | "ai_bot";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

    const body = await req.json().catch(() => ({}));
    const purpose = body.purpose as Purpose;
    const planKey = body.plan_key as string | undefined;
    if (!["deposit", "app_access", "ai_bot"].includes(purpose)) {
      return jsonResponse({ error: "Invalid purpose" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve app settings
    const { data: settingsRows } = await admin.from("app_settings").select("key, value");
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: { key: string; value: string }) => (settings[r.key] = r.value));
    const num = (k: string, d: number) => {
      const v = parseFloat(settings[k]);
      return isNaN(v) ? d : v;
    };

    let amount = 0;
    const metadata: Record<string, unknown> = { user_id: user.id, purpose };

    if (purpose === "deposit") {
      amount = Number(body.amount);
      const min = num("min_deposit", 1000);
      const max = num("max_deposit", 10000000);
      if (!amount || isNaN(amount) || amount < min || amount > max) {
        return jsonResponse({ error: `Amount must be between ${min} and ${max}` }, 400);
      }
    } else if (purpose === "app_access") {
      // Prefer a per-user invocation amount, else global access price
      const { data: inv } = await admin
        .from("access_invocations")
        .select("id, amount, status")
        .eq("user_id", user.id)
        .in("status", ["pending", "paid"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (inv) {
        amount = Number(inv.amount);
        metadata.invocation_id = inv.id;
      } else {
        amount = num("app_access_price", 5000);
      }
    } else if (purpose === "ai_bot") {
      const validPlans = ["daily", "6month", "lifetime"];
      if (!planKey || !validPlans.includes(planKey)) {
        return jsonResponse({ error: "Invalid plan" }, 400);
      }
      const defaults: Record<string, number> = { daily: 5000, "6month": 50000, lifetime: 500000 };
      amount = num(`ai_bot_${planKey}_price`, defaults[planKey]);
      metadata.plan_key = planKey;
    }

    if (!amount || amount <= 0) {
      return jsonResponse({ error: "Price not configured. Contact support." }, 400);
    }

    const reference = `fx_${crypto.randomUUID().replace(/-/g, "")}`;
    metadata.reference = reference;

    const origin = req.headers.get("origin") || "";
    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100), // NGN -> kobo
        currency: "NGN",
        reference,
        metadata,
        callback_url: origin || undefined,
      }),
    });
    const initData = await initRes.json();
    if (!initRes.ok || !initData.status) {
      console.error("Paystack init failed:", initData);
      return jsonResponse({ error: initData.message || "Could not start payment" }, 400);
    }

    const { error: insErr } = await admin.from("payment_intents").insert({
      user_id: user.id,
      purpose,
      plan_key: planKey || null,
      amount,
      reference,
      status: "pending",
      metadata,
    });
    if (insErr) {
      console.error("Intent insert failed:", insErr);
      return jsonResponse({ error: "Could not record payment" }, 500);
    }

    return jsonResponse({
      access_code: initData.data.access_code,
      authorization_url: initData.data.authorization_url,
      reference,
      amount,
    });
  } catch (e) {
    console.error("paystack-initialize error:", e);
    const msg = e instanceof Error ? e.message : "Internal error";
    return jsonResponse({ error: msg }, 500);
  }
});
