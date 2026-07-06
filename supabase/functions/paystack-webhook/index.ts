import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Paystack webhook — verifies signature, then fulfils the payment.
// No JWT (Paystack calls this directly). Security = HMAC signature check.

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) return new Response("Not configured", { status: 500 });

    const rawBody = await req.text();

    // Verify signature: HMAC SHA512 of raw body using the secret key
    const signature = req.headers.get("x-paystack-signature") || "";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(PAYSTACK_SECRET_KEY),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expected = toHex(mac);
    if (expected !== signature) {
      console.warn("Invalid Paystack signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(rawBody);
    if (event.event !== "charge.success") {
      return new Response("ok", { status: 200 });
    }

    const reference = event.data?.reference as string;
    if (!reference) return new Response("ok", { status: 200 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Double-check with Paystack that the transaction is genuinely successful
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.status || verifyData.data?.status !== "success") {
      console.warn("Verify not successful for", reference);
      return new Response("ok", { status: 200 });
    }

    const { data, error } = await admin.rpc("complete_payment_intent", { p_reference: reference });
    if (error) {
      console.error("complete_payment_intent error:", error);
      return new Response("error", { status: 500 });
    }
    console.log("Fulfilled", reference, data);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("paystack-webhook error:", e);
    return new Response("error", { status: 500 });
  }
});
