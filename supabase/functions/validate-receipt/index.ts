import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALIDATION_PROMPT = `You are a payment receipt validator. Analyze this image and determine if it is a VALID payment/transfer receipt or screenshot.

A VALID receipt must show evidence of:
- A bank or payment app interface (mobile banking, USSD confirmation, bank app)
- Transaction details like amount, date, reference number, or account info
- Sender/receiver information
- Transaction status (successful, completed, etc.)

INVALID images include:
- Random photos (selfies, nature, objects, memes)
- Edited or obviously fake screenshots
- Blank or mostly empty images
- Images of text that isn't a receipt
- Chat screenshots that aren't receipts
- Downloaded internet images

Respond with ONLY a JSON object (no markdown, no code blocks):
{"valid": true/false, "reason": "brief explanation", "confidence": 0-100}

If valid, reason should confirm what makes it a legitimate receipt.
If invalid, reason should explain why it's not acceptable (politely).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ valid: false, reason: "No image provided", confidence: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      // Fallback: accept the image if AI is unavailable
      return new Response(
        JSON.stringify({ valid: true, reason: "Validation service unavailable, accepted for manual review", confidence: 50 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Validating receipt image:", imageUrl.substring(0, 80) + "...");

    // Use Gemini vision model to analyze the image
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: VALIDATION_PROMPT },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI validation error:", response.status, errorText);
      // Fallback: accept for manual review
      return new Response(
        JSON.stringify({ valid: true, reason: "Validation pending manual review", confidence: 50 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "";
    
    console.log("AI response:", aiResponse);

    // Parse the JSON response
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      }
      
      const result = JSON.parse(cleanedResponse);
      
      return new Response(
        JSON.stringify({
          valid: result.valid === true,
          reason: result.reason || "Unable to determine",
          confidence: result.confidence || 50,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, "Raw:", aiResponse);
      // If parsing fails, check for keywords
      const lowerResponse = aiResponse.toLowerCase();
      const isValid = lowerResponse.includes('"valid": true') || lowerResponse.includes('"valid":true');
      
      return new Response(
        JSON.stringify({
          valid: isValid,
          reason: isValid ? "Receipt appears valid" : "Could not verify receipt authenticity",
          confidence: 60,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Receipt validation error:", error);
    return new Response(
      JSON.stringify({ valid: false, reason: "Validation failed, please try again", confidence: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
