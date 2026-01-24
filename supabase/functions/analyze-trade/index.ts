import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, tradeFocus, chart4hUrl, chart15mUrl } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the analysis prompt
    const prompt = `You are an expert forex and financial market analyst. Analyze the following trading setup and provide structured trade analysis.

Symbol/Instrument: ${symbol}
Trade Focus: ${tradeFocus === "scalp" ? "Scalping (short-term trades)" : "Swing trading (medium-term trades)"}
${chart4hUrl ? "4H Chart provided: Yes" : "4H Chart: Not provided"}
${chart15mUrl ? "15M Chart provided: Yes" : "15M Chart: Not provided"}

Based on current market conditions for ${symbol}, provide a comprehensive trade analysis. You must respond with a JSON object containing the following fields:

{
  "trend": "bullish" | "bearish" | "neutral",
  "tradeIdea": "buy" | "sell" | "hold",
  "entryPrice": "specific price level as string",
  "stopLoss": "specific price level as string",
  "takeProfit": "specific price level as string", 
  "rrRatio": "risk reward ratio like 1:2 or 1:3",
  "strength": "Strong" | "Moderate" | "Weak",
  "duration": "estimated trade duration like 2h 30m or 1d 4h",
  "analysisText": "2-3 sentence summary of the market analysis and reasoning",
  "riskWarning": "specific risk warning for this trade setup"
}

Important guidelines:
- Use realistic price levels based on current ${symbol} market prices
- Ensure stop loss and take profit levels make sense for the trend direction
- The RR ratio should reflect the distance between entry, SL, and TP
- Duration should match the trade focus (scalp = minutes to hours, swing = hours to days)
- Always include a relevant risk warning

Respond ONLY with the JSON object, no additional text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a professional forex and financial market analyst. Always respond with valid JSON only. Never include explanations outside the JSON structure.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get analysis from AI");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let analysisData;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      analysisData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Provide fallback data
      analysisData = {
        trend: "neutral",
        tradeIdea: "hold",
        entryPrice: "See chart",
        stopLoss: "See chart",
        takeProfit: "See chart",
        rrRatio: "1:2",
        strength: "Moderate",
        duration: tradeFocus === "scalp" ? "1h 30m" : "4h",
        analysisText: `Analysis for ${symbol} indicates mixed signals. Monitor key levels for confirmation before entering. The ${tradeFocus} setup requires patience for optimal entry.`,
        riskWarning: "Market conditions are volatile. Use proper position sizing and never risk more than 1-2% of your account on a single trade.",
      };
    }

    console.log("Analysis completed for:", symbol);

    return new Response(
      JSON.stringify(analysisData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
