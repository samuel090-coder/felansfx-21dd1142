// Generate AI reason + suggested amount for invoking paid access on a user
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { context, userName } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const sys = `You write short, professional reasons for why a specific user on Felans FX (a Nigerian trading platform) must pay a one-time access fee. Output ONLY a JSON object: {"reason": string, "amount": number}. Reason is 1-2 sentences, polite but firm, no emojis, NGN currency context. Amount is in Naira between 2000 and 50000, choose a sensible round figure that matches the severity of the reason.`;
    const user = `User: ${userName || "trader"}. Admin context: ${context || "Activate paid access for this account."}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`AI error ${r.status}: ${t}`);
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const amount = Math.max(2000, Math.min(50000, Math.round((Number(parsed.amount) || 5000) / 100) * 100));
    const reason = String(parsed.reason || "Your account requires a one-time access fee to continue using premium features.").slice(0, 500);

    return new Response(JSON.stringify({ reason, amount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
