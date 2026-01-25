import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// ============================================================================
// Pure Web Crypto implementation of Web Push (RFC 8291 + RFC 8292)
// ============================================================================

function base64UrlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64UrlEncode(data: Uint8Array): string {
  const binary = String.fromCharCode(...data);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function createVapidJwt(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyRaw = base64UrlDecode(vapidPrivateKey);
  const publicKeyRaw = base64UrlDecode(vapidPublicKey);

  // Create JWK from raw keys
  const privateKeyJwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(publicKeyRaw.slice(1, 33)),
    y: base64UrlEncode(publicKeyRaw.slice(33, 65)),
    d: base64UrlEncode(privateKeyRaw),
  };

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert signature to base64url
  const signatureArray = new Uint8Array(signature);
  const signatureB64 = base64UrlEncode(signatureArray);

  const jwt = `${unsignedToken}.${signatureB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey,
  };
}

async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import subscriber's public key
  const subscriberPublicKeyRaw = base64UrlDecode(p256dhKey);
  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw",
    subscriberPublicKeyRaw.buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Import auth secret
  const authSecretBytes = base64UrlDecode(authSecret);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF for auth info
  const authInfo = new TextEncoder().encode("WebPush: info\0");
  const authInfoFull = concatUint8Arrays(
    authInfo,
    subscriberPublicKeyRaw,
    localPublicKey
  );

  // Import shared secret as HKDF key
  const sharedSecretKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret.buffer as ArrayBuffer,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // Derive IKM using auth secret as salt
  const ikmBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: authSecretBytes.buffer as ArrayBuffer,
      info: authInfoFull.buffer as ArrayBuffer,
    },
    sharedSecretKey,
    256
  );
  const ikm = new Uint8Array(ikmBits);

  // Import IKM for key derivation
  const ikmKey = await crypto.subtle.importKey(
    "raw",
    ikm.buffer as ArrayBuffer,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // Derive content encryption key
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cekBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt.buffer as ArrayBuffer,
      info: cekInfo.buffer as ArrayBuffer,
    },
    ikmKey,
    128
  );
  const cek = await crypto.subtle.importKey(
    "raw",
    cekBits,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Derive nonce
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt.buffer as ArrayBuffer,
      info: nonceInfo.buffer as ArrayBuffer,
    },
    ikmKey,
    96
  );
  const nonce = new Uint8Array(nonceBits);

  // Add padding and encrypt
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = concatUint8Arrays(payloadBytes, new Uint8Array([2])); // Delimiter

  const encryptedContent = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    cek,
    paddedPayload.buffer as ArrayBuffer
  );

  // Build aes128gcm content
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);

  const encrypted = concatUint8Arrays(
    salt,
    recordSize,
    new Uint8Array([localPublicKey.length]),
    localPublicKey,
    new Uint8Array(encryptedContent)
  );

  return { encrypted, salt, localPublicKey };
}

async function sendPushNotification(
  subscription: SubscriptionRow,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<{ success: boolean; status?: number; expired?: boolean }> {
  try {
    const payloadString = JSON.stringify(payload);

    // Create VAPID authorization
    const { authorization } = await createVapidJwt(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      subject
    );

    // Encrypt the payload
    const { encrypted } = await encryptPayload(
      payloadString,
      subscription.p256dh,
      subscription.auth
    );

    // Send the request
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Authorization": authorization,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Urgency": "high",
      },
      body: encrypted.buffer as ArrayBuffer,
    });

    if (response.ok || response.status === 201) {
      return { success: true, status: response.status };
    }

    const expired = response.status === 404 || response.status === 410;
    console.error(`Push failed: ${response.status} ${response.statusText}`);
    return { success: false, status: response.status, expired };
  } catch (error) {
    console.error("Push error:", error);
    return { success: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    const authHeader = req.headers.get("Authorization");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // Require auth + admin role (prevents anyone from broadcasting)
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _role: "admin",
      _user_id: authData.user.id,
    });
    if (roleError || !isAdmin) {
      console.error("Role check error:", roleError);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { userIds, title, message, url } = body;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "Title and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push notifications to ${userIds?.length || "all"} users`);

    // Fetch push subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds);
    }

    const { data: subscriptionsRaw, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      throw fetchError;
    }

    const subscriptions = (subscriptionsRaw || []) as unknown as SubscriptionRow[];

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscribers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dedupe by endpoint (extra safety)
    const uniqueByEndpoint = new Map<string, SubscriptionRow>();
    for (const s of subscriptions) {
      if (!uniqueByEndpoint.has(s.endpoint)) uniqueByEndpoint.set(s.endpoint, s);
    }
    const uniqueSubscriptions = [...uniqueByEndpoint.values()];

    console.log(`Found ${uniqueSubscriptions.length} unique subscriptions`);

    const payload: PushPayload = {
      title,
      body: message,
      url: url || "/",
      icon: "/favicon.ico",
    };

    let successCount = 0;
    const expiredEndpoints: string[] = [];
    let failedCount = 0;

    for (const sub of uniqueSubscriptions) {
      const result = await sendPushNotification(
        sub,
        payload,
        vapidPublicKey,
        vapidPrivateKey,
        "mailto:no-reply@felansfx.lovable.app"
      );

      if (result.success) {
        successCount++;
        console.log(`Push sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
      } else {
        failedCount++;
        if (result.expired) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    }

    // Also create in-app notifications for all targeted users
    const uniqueUserIds = [...new Set(uniqueSubscriptions.map((s) => s.user_id))];
    const notifications = uniqueUserIds.map((userId: string) => ({
      user_id: userId,
      title,
      message,
      type: "info" as const,
      action_url: url || "/",
    }));

    const { error: notifError } = await supabase.from("notifications").insert(notifications);
    if (notifError) {
      console.error("Error creating in-app notifications:", notifError);
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      console.log(`Removing ${expiredEndpoints.length} expired subscriptions`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    console.log(`Push notifications sent: ${successCount}/${uniqueSubscriptions.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: uniqueSubscriptions.length,
        users: uniqueUserIds.length,
        failed: failedCount,
        expired: expiredEndpoints.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in send-push function:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
