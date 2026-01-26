import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { sendPushNotifications } from "../_shared/push-helper.ts";
 
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch image:", url, response.status);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const contentType = response.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
}

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

    // Fetch chart images if provided
    let chart4hBase64: string | null = null;
    let chart15mBase64: string | null = null;

    if (chart4hUrl) {
      console.log("Fetching 4H chart from:", chart4hUrl);
      chart4hBase64 = await fetchImageAsBase64(chart4hUrl);
    }
    if (chart15mUrl) {
      console.log("Fetching 15M chart from:", chart15mUrl);
      chart15mBase64 = await fetchImageAsBase64(chart15mUrl);
    }

    const hasCharts = chart4hBase64 || chart15mBase64;

    // Build the messages array with images
    const messages: any[] = [
      {
        role: "system",
        content: `You are an expert professional forex and financial market technical analyst with 20+ years of experience. Your role is to provide accurate, data-driven trade analysis.

CRITICAL VALIDATION RULES:
1. FIRST, examine any provided images carefully
2. If the image is NOT a valid trading chart (candlestick chart, line chart, or bar chart showing price action), you MUST respond with:
   {"error": "INVALID_CHART", "message": "The uploaded image does not appear to be a valid trading chart. Please upload a clear candlestick or price chart for analysis."}
3. If no charts are provided, analyze based on the symbol name only but clearly state this limitation
4. Only proceed with analysis if you can identify valid price chart elements (candlesticks, price axis, time axis, indicators, etc.)

When analyzing valid charts, look for:
- Trend direction (higher highs/lows for bullish, lower highs/lows for bearish)
- Support and resistance levels visible on the chart
- Candlestick patterns (engulfing, doji, hammer, etc.)
- Chart patterns (triangles, head and shoulders, flags, etc.)
- Any visible indicators (moving averages, RSI, MACD, etc.)
- Key price levels visible on the chart

Always respond with valid JSON only. Never include explanations outside the JSON structure.`
      }
    ];

    // Build user message content
    const userContent: any[] = [];

    // Add chart images if available
    if (chart4hBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: chart4hBase64 }
      });
      userContent.push({
        type: "text",
        text: "Above is the 4H (4-hour) timeframe chart."
      });
    }

    if (chart15mBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: chart15mBase64 }
      });
      userContent.push({
        type: "text",
        text: "Above is the 15M (15-minute) timeframe chart."
      });
    }

    // Add the analysis request
    const analysisPrompt = `
TRADING SETUP DETAILS:
- Symbol/Instrument: ${symbol}
- Trade Focus: ${tradeFocus === "scalp" ? "Scalping (short-term trades, typically minutes to a few hours)" : "Swing trading (medium-term trades, typically hours to days)"}
- Charts Provided: ${hasCharts ? "Yes - analyze the chart(s) above" : "No charts provided"}

${hasCharts ? `
IMPORTANT: Carefully examine the chart image(s) provided above.
1. First, verify these are valid trading/price charts
2. If they are NOT valid charts (e.g., random photos, non-chart images), respond with the INVALID_CHART error
3. If valid, identify specific price levels, patterns, and indicators visible on the chart
4. Base your entry, stop loss, and take profit on ACTUAL price levels you can see on the chart
` : `
NOTE: No chart images were provided. Provide general market analysis for ${symbol} based on typical market behavior. Clearly indicate that chart analysis was not possible.
`}

Provide a comprehensive trade analysis in this exact JSON format:

{
  "trend": "bullish" | "bearish" | "neutral",
  "tradeIdea": "buy" | "sell" | "hold",
  "entryPrice": "specific price level from chart or market price",
  "stopLoss": "specific price level for stop loss",
  "takeProfit": "specific price level for take profit",
  "rrRatio": "risk reward ratio like 1:2 or 1:3",
  "strength": "Strong" | "Moderate" | "Weak",
  "duration": "estimated trade duration based on trade focus",
  "analysisText": "3-4 sentences describing what you see on the chart, including specific patterns, levels, and your reasoning. Be specific about what you observed.",
  "riskWarning": "specific risk warning relevant to this setup"
}

REQUIREMENTS:
- Entry, SL, and TP must be realistic prices for ${symbol}
- For scalping: duration should be minutes to hours (e.g., "45m", "2h 15m")
- For swing: duration should be hours to days (e.g., "8h", "2d 4h")
- Analysis text MUST reference specific observations from the chart if provided
- Include a relevant risk warning

Respond ONLY with the JSON object.`;

    userContent.push({
      type: "text",
      text: analysisPrompt
    });

    messages.push({
      role: "user",
      content: userContent
    });

    console.log("Sending request to AI with", hasCharts ? "chart images" : "no charts");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        temperature: 0,
        max_tokens: 1500,
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

    console.log("AI Response received:", content.substring(0, 200));

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

      // Check if AI detected invalid chart
      if (analysisData.error === "INVALID_CHART") {
        return new Response(
          JSON.stringify({ 
            error: "Invalid chart image",
            message: analysisData.message || "Please upload a valid trading chart (candlestick or price chart) for analysis."
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to process analysis. Please try again.");
    }

    // Validate required fields
    const requiredFields = ['trend', 'tradeIdea', 'entryPrice', 'stopLoss', 'takeProfit', 'rrRatio', 'strength', 'duration', 'analysisText', 'riskWarning'];
    for (const field of requiredFields) {
      if (!analysisData[field]) {
        console.error(`Missing field: ${field}`);
        analysisData[field] = field === 'trend' ? 'neutral' : 
                             field === 'tradeIdea' ? 'hold' :
                             field === 'strength' ? 'Moderate' :
                             'See analysis';
      }
    }

    console.log("Analysis completed successfully for:", symbol);

   // Send push notification to user about completed analysis
   try {
     const authHeader = req.headers.get("Authorization");
     if (authHeader) {
       const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
       const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
       const supabase = createClient(supabaseUrl, supabaseServiceKey, {
         global: { headers: { Authorization: authHeader } },
       });

       const { data: { user } } = await supabase.auth.getUser();
       
       if (user) {
         await sendPushNotifications({
           userIds: [user.id],
           title: "Analysis Complete",
           message: `Your ${symbol} analysis is ready! ${analysisData.tradeIdea === "buy" ? "📈" : analysisData.tradeIdea === "sell" ? "📉" : "⏸️"} ${analysisData.tradeIdea.toUpperCase()} signal detected.`,
           url: "/history",
           type: "success",
         });
       }
     }
   } catch (pushError) {
     console.error("Failed to send push notification:", pushError);
     // Don't fail the whole request if push fails
   }

    return new Response(
      JSON.stringify(analysisData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
