import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DepositNotificationRequest {
  action: "approve" | "reject";
  depositId: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  reason?: string;
}

// Format amount in NGN
function formatNGN(amount: number): string {
  return `₦${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUSD(amountNGN: number): string {
  const usd = amountNGN * 0.00063;
  return `$${usd.toFixed(2)}`;
}

// ========== Web Push Implementation (Deno-native) ==========

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  base64 += "=".repeat(padding);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string,
  expSeconds: number = 12 * 60 * 60
): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + expSeconds,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes.buffer as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureBytes = new Uint8Array(signatureBuffer);
  const signatureB64 = base64UrlEncode(signatureBytes);

  return `${unsignedToken}.${signatureB64}`;
}

async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const subscriberPublicKeyBytes = base64UrlDecode(p256dhKey);
  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw",
    subscriberPublicKeyBytes.buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  const authSecretBytes = base64UrlDecode(authSecret);

  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw);

  const infoAuth = new Uint8Array([
    ...new TextEncoder().encode("WebPush: info\0"),
    ...subscriberPublicKeyBytes,
    ...localPublicKeyBytes,
  ]);

  const sharedSecretKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const prkAuthBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecretBytes.buffer as ArrayBuffer, info: infoAuth.buffer as ArrayBuffer },
    sharedSecretKey,
    256
  );

  const prkAuth = await crypto.subtle.importKey(
    "raw",
    prkAuthBits,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const infoCek = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt.buffer as ArrayBuffer, info: infoCek.buffer as ArrayBuffer },
    prkAuth,
    128
  );

  const infoNonce = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt.buffer as ArrayBuffer, info: infoNonce.buffer as ArrayBuffer },
    prkAuth,
    96
  );

  const cek = await crypto.subtle.importKey(
    "raw",
    cekBits,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2;

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonceBits) },
    cek,
    paddedPayload
  );

  return {
    ciphertext: new Uint8Array(encrypted),
    salt,
    localPublicKey: localPublicKeyBytes,
  };
}

function buildAes128GcmBody(
  ciphertext: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array
): Uint8Array {
  const recordSize = 4096;
  const header = new Uint8Array(86);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, recordSize, false);
  header[20] = localPublicKey.length;
  header.set(localPublicKey, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header, 0);
  body.set(ciphertext, header.length);
  return body;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; url?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    const jwt = await createVapidJwt(audience, "mailto:admin@felansfx.com", vapidPrivateKey);
    const payloadJson = JSON.stringify(payload);
    const { ciphertext, salt, localPublicKey } = await encryptPayload(
      payloadJson,
      subscription.p256dh,
      subscription.auth
    );
    const body = buildAes128GcmBody(ciphertext, salt, localPublicKey);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": "86400",
        "Urgency": "high",
      },
      body: body.buffer as ArrayBuffer,
    });

    if (response.status === 201 || response.status === 200) {
      return { success: true, status: response.status };
    } else {
      const errorText = await response.text();
      return { success: false, status: response.status, error: errorText };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: DepositNotificationRequest = await req.json();
    const { action, depositId, userId, userEmail, userName, amount, reason } = body;

    console.log(`Processing ${action} notification for deposit ${depositId}`);

    // Fetch the appropriate template
    const templateKey = action === "approve" ? "deposit_approved" : "deposit_rejected";
    const { data: template, error: templateError } = await supabase
      .from("notification_templates")
      .select("subject, body, is_active")
      .eq("key", templateKey)
      .single();

    if (templateError || !template) {
      console.error("Template not found:", templateError);
      throw new Error("Notification template not found");
    }

    if (!template.is_active) {
      console.log("Template is disabled, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "Template disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format amount in NGN (primary) with USD equivalent
    const amountFormatted = `${formatNGN(amount)} (approx. ${formatUSD(amount)} USD)`;

    // Replace placeholders in template - use NGN format
    const subject = template.subject;
    const emailBody = template.body
      .replace(/\$AMOUNT/g, amountFormatted)
      .replace(/\$REASON/g, reason || "No reason provided")
      .replace(/\$USER/g, userName || "User");

    // Create in-app notification with NGN currency
    const notificationType = action === "approve" ? "success" : "error";
    const notificationTitle = action === "approve" 
      ? "Deposit Approved" 
      : "Deposit Rejected";
    const notificationMessage = action === "approve"
      ? `Your deposit of ${formatNGN(amount)} has been approved and credited to your wallet.`
      : `Your deposit of ${formatNGN(amount)} has been rejected. ${reason || ""}`;

    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: userId,
      title: notificationTitle,
      message: notificationMessage,
      type: notificationType,
      action_url: "/deposit",
    });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    }

    // ========== SEND PUSH NOTIFICATION ==========
    let pushResult = { sent: 0, failed: 0, cleaned: 0 };

    if (vapidPublicKey && vapidPrivateKey) {
      // Get user's push subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", userId);

      if (subError) {
        console.error("Error fetching push subscriptions:", subError);
      } else if (subscriptions && subscriptions.length > 0) {
        console.log(`Found ${subscriptions.length} push subscription(s) for user ${userId}`);

        const pushPayload = {
          title: notificationTitle,
          body: notificationMessage,
          icon: "/favicon-512.png",
          url: "/deposit",
        };

        // Deduplicate by endpoint
        const uniqueEndpoints = new Map<string, typeof subscriptions[0]>();
        for (const sub of subscriptions) {
          if (!uniqueEndpoints.has(sub.endpoint)) {
            uniqueEndpoints.set(sub.endpoint, sub);
          }
        }

        const expiredIds: string[] = [];

        for (const [endpoint, sub] of uniqueEndpoints) {
          const result = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            pushPayload,
            vapidPublicKey,
            vapidPrivateKey
          );

          if (result.success) {
            pushResult.sent++;
            console.log(`Push sent to endpoint: ${endpoint.substring(0, 50)}...`);
          } else {
            pushResult.failed++;
            console.error(`Push failed for endpoint: ${endpoint.substring(0, 50)}... Status: ${result.status}, Error: ${result.error}`);
            
            // Clean up expired subscriptions
            if (result.status === 404 || result.status === 410) {
              expiredIds.push(sub.id);
            }
          }
        }

        // Delete expired subscriptions
        if (expiredIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("push_subscriptions")
            .delete()
            .in("id", expiredIds);
          
          if (!deleteError) {
            pushResult.cleaned = expiredIds.length;
            console.log(`Cleaned up ${expiredIds.length} expired subscription(s)`);
          }
        }
      } else {
        console.log(`No push subscriptions found for user ${userId}`);
      }
    } else {
      console.log("VAPID keys not configured, skipping push notification");
    }

    // Build mailto: URL for native email app
    const mailtoUrl = `mailto:${encodeURIComponent(userEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

    console.log(`Notification created successfully. Push: ${pushResult.sent} sent, ${pushResult.failed} failed, ${pushResult.cleaned} cleaned`);

    return new Response(
      JSON.stringify({
        success: true,
        mailtoUrl,
        subject,
        body: emailBody,
        pushResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in deposit-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});