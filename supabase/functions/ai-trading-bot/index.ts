import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Check if user has active AI bot subscription
    const { data: unlock } = await client
      .from("user_unlocks")
      .select("*")
      .eq("user_id", user.id)
      .eq("unlock_type", "ai_trading_bot")
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!unlock) throw new Error("AI Bot not activated. Please purchase first.");

    const { symbol, current_price } = await req.json();
    if (!symbol || !current_price) throw new Error("Missing symbol or price");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const prompt = `You are an expert forex/crypto technical analyst. Analyze ${symbol} at current price ${current_price}.

Provide a trading signal with:
1. Direction (BUY or SELL)
2. Confidence (50-95%)
3. Entry price (near current)
4. Stop loss
5. Take profit
6. Brief reasoning (2-3 sentences)

IMPORTANT: Be realistic. Not every setup is a trade. If uncertain, give lower confidence.

Respond with ONLY this JSON (no markdown):
{"direction":"BUY","confidence":72,"entry":"${current_price}","stopLoss":"X","takeProfit":"X","reasoning":"Brief analysis"}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a trading analyst AI. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      throw new Error("AI service unavailable");
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let signal;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      signal = JSON.parse(jsonMatch?.[0] || content);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    // Save signal to database
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await serviceClient.from("ai_signals").insert({
      symbol,
      signal_type: signal.direction,
      confidence: signal.confidence,
      entry_price: parseFloat(signal.entry) || current_price,
      stop_loss: parseFloat(signal.stopLoss) || null,
      take_profit: parseFloat(signal.takeProfit) || null,
      analysis: signal.reasoning,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
    });

    return new Response(JSON.stringify({
      signal: {
        symbol,
        direction: signal.direction,
        confidence: signal.confidence,
        entry: signal.entry || current_price.toString(),
        stopLoss: signal.stopLoss || "—",
        takeProfit: signal.takeProfit || "—",
        reasoning: signal.reasoning || "",
        timeframe: "5m",
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
