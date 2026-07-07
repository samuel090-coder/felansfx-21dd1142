import { supabase } from "@/integrations/supabase/client";

const PAYSTACK_INLINE_SRC = "https://js.paystack.co/v2/inline.js";

let scriptPromise: Promise<boolean> | null = null;

// Loads the Paystack inline script once. Resolves false if it fails to load.
const loadPaystackScript = (): Promise<boolean> => {
  if (typeof window === "undefined") return Promise.resolve(false);
  // deno-lint-ignore no-explicit-any
  if ((window as any).PaystackPop) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = PAYSTACK_INLINE_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return scriptPromise;
};

export type PaymentPurpose = "deposit" | "app_access" | "ai_bot";

export interface StartPaymentParams {
  purpose: PaymentPurpose;
  amount?: number; // required for deposits
  planKey?: string; // required for ai_bot
}

export type PaymentResult =
  | { status: "success"; reference: string }
  | { status: "pending"; reference: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

// Confirms a payment is fulfilled: first asks the server to verify with Paystack
// (instant path), then polls the intent status as a fallback (webhook path).
const confirmFulfilment = async (reference: string, timeoutMs = 90000): Promise<boolean> => {
  // Instant verify + fulfil
  try {
    const { data } = await supabase.functions.invoke("paystack-verify", {
      body: { reference },
    });
    if ((data as { status?: string } | null)?.status === "success") return true;
  } catch {
    /* fall through to polling */
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase
      .from("payment_intents")
      .select("status")
      .eq("reference", reference)
      .maybeSingle();
    if (data?.status === "success") return true;
    await new Promise((r) => setTimeout(r, 2500));
  }
  return false;
};

/**
 * Starts a Paystack payment. Opens an on-page overlay when possible;
 * if the inline script can't load, it redirects the user to Paystack.
 */
export const startPaystackPayment = async (params: StartPaymentParams): Promise<PaymentResult> => {
  // 1. Initialize the transaction on the server (amount is computed & validated there)
  const { data, error } = await supabase.functions.invoke("paystack-initialize", {
    body: { purpose: params.purpose, amount: params.amount, plan_key: params.planKey },
  });

  if (error || !data?.access_code) {
    const message =
      (data as { error?: string } | null)?.error || error?.message || "Could not start payment";
    return { status: "error", message };
  }

  const { access_code, authorization_url, reference } = data as {
    access_code: string;
    authorization_url: string;
    reference: string;
  };

  const scriptLoaded = await loadPaystackScript();

  // Fallback: redirect out to Paystack's hosted page
  if (!scriptLoaded || typeof (window as any).PaystackPop === "undefined") {
    window.location.href = authorization_url;
    return { status: "pending", reference };
  }

  // Overlay checkout
  return new Promise<PaymentResult>((resolve) => {
    try {
      // deno-lint-ignore no-explicit-any
      const popup = new (window as any).PaystackPop();
      popup.resumeTransaction(access_code, {
        onSuccess: async () => {
          const ok = await confirmFulfilment(reference);
          resolve(ok ? { status: "success", reference } : { status: "pending", reference });
        },
        onCancel: () => resolve({ status: "cancelled" }),
        onError: (err: { message?: string }) =>
          resolve({ status: "error", message: err?.message || "Payment failed" }),
      });
    } catch (e) {
      // If overlay init throws, fall back to redirect
      window.location.href = authorization_url;
      resolve({ status: "pending", reference });
    }
  });
};
