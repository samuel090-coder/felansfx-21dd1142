// Firebase Cloud Messaging via the Lovable connector gateway.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

export interface FcmMessage {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

export interface FcmSendResult {
  sent: number;
  failed: number;
  staleTokens: string[];
  errors: { token: string; status: number; body: string }[];
}

export function isFcmConfigured(): boolean {
  return Boolean(Deno.env.get("LOVABLE_API_KEY") && Deno.env.get("FIREBASE_MESSAGING_API_KEY"));
}

function headers() {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionApiKey = Deno.env.get("FIREBASE_MESSAGING_API_KEY");
  if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!connectionApiKey) throw new Error("FIREBASE_MESSAGING_API_KEY is not configured");
  return {
    Authorization: `Bearer ${lovableApiKey}`,
    "X-Connection-Api-Key": connectionApiKey,
    "Content-Type": "application/json",
  };
}

/** Sends a data-only message to one device token. */
export async function sendFcmToToken(token: string, msg: FcmMessage): Promise<{ ok: true } | { ok: false; status: number; body: string; stale: boolean }> {
  const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      message: {
        token,
        data: {
          title: msg.title,
          body: msg.body,
          url: msg.url ?? "/",
          icon: msg.icon ?? "/favicon-512.png",
          tag: msg.tag ?? "felansfx-notification",
        },
        webpush: {
          headers: { Urgency: "high", TTL: "86400" },
          fcm_options: { link: msg.url ?? "/" },
        },
        android: { priority: "high" },
        apns: { headers: { "apns-priority": "10" } },
      },
    }),
  });

  if (res.ok) return { ok: true };

  const body = await res.text();
  const stale =
    res.status === 404 ||
    (res.status === 400 && /INVALID_ARGUMENT|not a valid FCM registration token/i.test(body));
  return { ok: false, status: res.status, body, stale };
}

/** Sends to many tokens with light concurrency; reports stale tokens for cleanup. */
export async function sendFcmToTokens(tokens: string[], msg: FcmMessage): Promise<FcmSendResult> {
  const result: FcmSendResult = { sent: 0, failed: 0, staleTokens: [], errors: [] };
  const unique = [...new Set(tokens)];
  const CONCURRENCY = 10;

  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    const outcomes = await Promise.all(batch.map((t) => sendFcmToToken(t, msg).catch((e) => ({ ok: false as const, status: 0, body: String(e), stale: false }))));
    outcomes.forEach((o, idx) => {
      const token = batch[idx];
      if (o.ok) {
        result.sent++;
      } else {
        result.failed++;
        if (o.stale) result.staleTokens.push(token);
        result.errors.push({ token, status: o.status, body: o.body.slice(0, 300) });
        console.error(`FCM send failed [${o.status}] for ${token.slice(0, 16)}…: ${o.body.slice(0, 200)}`);
      }
    });
  }
  return result;
}
