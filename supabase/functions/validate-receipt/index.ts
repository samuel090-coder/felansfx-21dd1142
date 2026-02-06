import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ExpectedBeneficiary = {
  receiver_name?: string;
  receiver_bank?: string;
  receiver_account?: string;
};

type ExtractedReceipt = {
  amount_ngn: number | null;
  status: string | null;
  date_text: string | null;
  receiver_name: string | null;
  receiver_bank: string | null;
  receiver_account: string | null;
  reference: string | null;
  is_screenshot: boolean | null;
};

function normalizeText(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(s: string) {
  return (s || "").replace(/\D+/g, "");
}

function buildPrompt(params: {
  expectedAmountNgn?: number;
  expectedBeneficiary?: ExpectedBeneficiary;
}) {
  const { expectedAmountNgn, expectedBeneficiary } = params;

  const expectedBlock = {
    expected_amount_ngn: expectedAmountNgn ?? null,
    expected_beneficiary: {
      receiver_name: expectedBeneficiary?.receiver_name ?? null,
      receiver_bank: expectedBeneficiary?.receiver_bank ?? null,
      receiver_account: expectedBeneficiary?.receiver_account ?? null,
    },
  };

  return `You are a STRICT payment receipt validator for bank transfers.

Your job: verify whether the image is a REAL bank/payment transfer confirmation screenshot AND whether it MATCHES the expected deposit.

Expected details (must match if provided):\n${JSON.stringify(expectedBlock)}\n
Rules:
- If the image is NOT a payment/transfer receipt screenshot, valid=false.
- If you cannot clearly read the amount, valid=false.
- If expected_amount_ngn is provided and extracted amount does not equal it, valid=false.
- If expected beneficiary fields are provided, the receipt must contain matching receiver name/bank/account.
  - For account matching: last 4 digits match is acceptable if full number not visible.
- Receipt must show a success/completed status (not pending/failed).
- Receipt must show a transaction date/time (if missing, valid=false).

Return ONLY JSON (no markdown):
{
  "valid": boolean,
  "reason": string,
  "confidence": number,
  "extracted": {
    "amount_ngn": number|null,
    "status": string|null,
    "date_text": string|null,
    "receiver_name": string|null,
    "receiver_bank": string|null,
    "receiver_account": string|null,
    "reference": string|null,
    "is_screenshot": boolean|null
  }
}`;
}

function computeFinalVerdict(args: {
  expectedAmountNgn?: number;
  expectedBeneficiary?: ExpectedBeneficiary;
  extracted: ExtractedReceipt;
}): { valid: boolean; reason: string } {
  const { expectedAmountNgn, expectedBeneficiary, extracted } = args;

  if (!extracted) {
    return { valid: false, reason: "Could not read receipt details. Please upload a clearer screenshot." };
  }

  if (!extracted.date_text || !String(extracted.date_text).trim()) {
    return {
      valid: false,
      reason: "Receipt must show a transaction date/time. Please upload the transfer confirmation screenshot.",
    };
  }

  if (!extracted.status || !String(extracted.status).trim()) {
    return {
      valid: false,
      reason: "Receipt must show a successful/completed status. Please upload the correct transfer confirmation.",
    };
  }

  const statusNorm = normalizeText(String(extracted.status));
  const statusOk =
    statusNorm.includes("success") ||
    statusNorm.includes("successful") ||
    statusNorm.includes("completed") ||
    statusNorm.includes("approved") ||
    statusNorm.includes("done");
  if (!statusOk) {
    return {
      valid: false,
      reason: "This receipt does not look successful/completed. Please upload a successful transfer confirmation.",
    };
  }

  if (extracted.amount_ngn == null || Number.isNaN(extracted.amount_ngn)) {
    return { valid: false, reason: "I couldn't clearly see the transfer amount. Please upload a clearer screenshot." };
  }

  if (typeof expectedAmountNgn === "number") {
    const expected = Math.round(expectedAmountNgn);
    const got = Math.round(extracted.amount_ngn);
    if (expected !== got) {
      return {
        valid: false,
        reason: `Amount mismatch. You selected ₦${expected.toLocaleString()} but the screenshot shows ₦${got.toLocaleString()}. Please upload the correct receipt.`,
      };
    }
  }

  if (expectedBeneficiary?.receiver_account) {
    const expDigits = digitsOnly(expectedBeneficiary.receiver_account);
    const gotDigits = digitsOnly(extracted.receiver_account || "");

    const expLast4 = expDigits.slice(-4);
    const gotLast4 = gotDigits.slice(-4);

    if (!gotDigits) {
      return {
        valid: false,
        reason: "Receiver account number is not visible. Please upload a screenshot that shows the beneficiary account.",
      };
    }

    if (expLast4 && gotLast4 && expLast4 !== gotLast4) {
      return {
        valid: false,
        reason: "Receiver account number does not match the expected account. Please upload the correct receipt.",
      };
    }
  }

  if (expectedBeneficiary?.receiver_bank) {
    const expBank = normalizeText(expectedBeneficiary.receiver_bank);
    const gotBank = normalizeText(extracted.receiver_bank || "");

    if (!gotBank) {
      return { valid: false, reason: "Bank name is not visible on this receipt. Please upload a clearer screenshot." };
    }

    if (expBank && gotBank && !gotBank.includes(expBank) && !expBank.includes(gotBank)) {
      return { valid: false, reason: "Receiver bank does not match the expected bank. Please upload the correct receipt." };
    }
  }

  if (expectedBeneficiary?.receiver_name) {
    const expName = normalizeText(expectedBeneficiary.receiver_name);
    const gotName = normalizeText(extracted.receiver_name || "");

    if (!gotName) {
      return { valid: false, reason: "Receiver name is not visible on this receipt. Please upload a clearer screenshot." };
    }

    // partial/loose match
    if (expName && gotName && !gotName.includes(expName) && !expName.includes(gotName)) {
      const expFirst = expName.split(" ")[0];
      const gotFirst = gotName.split(" ")[0];
      if (expFirst && gotFirst && expFirst !== gotFirst) {
        return { valid: false, reason: "Receiver name does not match the expected beneficiary. Please upload the correct receipt." };
      }
    }
  }

  return { valid: true, reason: "Receipt looks valid and matches the selected amount." };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require authentication (prevents abuse)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ valid: false, reason: "Unauthorized", confidence: 0 }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, expectedAmountNgn, expectedBeneficiary } = (await req.json()) as {
      imageUrl?: string;
      expectedAmountNgn?: number;
      expectedBeneficiary?: ExpectedBeneficiary;
    };

    if (!imageUrl) {
      return new Response(JSON.stringify({ valid: false, reason: "No image provided", confidence: 0 }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({
          valid: false,
          reason: "Receipt validation is temporarily unavailable. Please try again.",
          confidence: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Validating receipt image:", imageUrl.substring(0, 80) + "...");

    const prompt = buildPrompt({ expectedAmountNgn, expectedBeneficiary });

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
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI validation error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          valid: false,
          reason: "I couldn't verify that screenshot. Please upload a clear bank transfer confirmation screenshot.",
          confidence: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "";
    console.log("AI response:", aiResponse);

    let extracted: ExtractedReceipt | null = null;
    let modelReason = "";
    let modelConfidence = 50;

    try {
      let cleaned = String(aiResponse).trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      }
      const parsed = JSON.parse(cleaned);
      modelReason = parsed.reason || "";
      modelConfidence = typeof parsed.confidence === "number" ? parsed.confidence : 50;
      extracted = parsed.extracted || null;
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return new Response(
        JSON.stringify({
          valid: false,
          reason: "I couldn't read that receipt clearly. Please upload a clearer screenshot.",
          confidence: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const final = computeFinalVerdict({
      expectedAmountNgn,
      expectedBeneficiary,
      extracted: extracted as ExtractedReceipt,
    });

    const finalConfidence = final.valid ? Math.max(modelConfidence, 70) : Math.min(modelConfidence, 60);

    return new Response(
      JSON.stringify({
        valid: final.valid,
        reason: final.reason || modelReason || (final.valid ? "Valid receipt" : "Invalid receipt"),
        confidence: finalConfidence,
        extracted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Receipt validation error:", error);
    return new Response(
      JSON.stringify({ valid: false, reason: "Validation failed, please try again", confidence: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
