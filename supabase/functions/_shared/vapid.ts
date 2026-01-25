// Shared VAPID utilities for push notifications
// Converts raw base64url VAPID keys to JWK format

// Helper to decode base64url to Uint8Array
export function base64UrlDecode(str: string): Uint8Array {
  // Add padding
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) padded += "=";
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Helper to encode Uint8Array to base64url
export function base64UrlEncode(data: Uint8Array): string {
  const binary = String.fromCharCode(...data);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Convert raw VAPID keys (base64url) to JWK format for the webpush library
export function rawKeysToJwk(publicKeyB64: string, privateKeyB64: string): {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
} {
  // Decode the raw keys
  const publicKeyBytes = base64UrlDecode(publicKeyB64);
  let privateKeyBytes = base64UrlDecode(privateKeyB64);

  // Public key is 65 bytes: 0x04 prefix + 32 bytes X + 32 bytes Y
  if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
    throw new Error(`Invalid public key format. Expected 65 bytes starting with 0x04, got ${publicKeyBytes.length} bytes`);
  }

  // Private key should be 32 bytes (the D value)
  // Some implementations strip leading zeros, so pad if necessary
  if (privateKeyBytes.length < 32) {
    const padded = new Uint8Array(32);
    padded.set(privateKeyBytes, 32 - privateKeyBytes.length);
    privateKeyBytes = padded;
    console.log(`Padded private key from ${privateKeyBytes.length} to 32 bytes`);
  } else if (privateKeyBytes.length > 32) {
    throw new Error(`Invalid private key format. Expected 32 bytes, got ${privateKeyBytes.length} bytes`);
  }

  // Extract X, Y coordinates from public key (skip 0x04 prefix)
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);
  const d = privateKeyBytes;

  // Create JWK format
  const publicKey: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
  };

  const privateKey: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
    d: base64UrlEncode(d),
  };

  return { publicKey, privateKey };
}

// Get VAPID keys from environment and convert to JWK
export function getVapidKeysAsJwk(): { publicKey: JsonWebKey; privateKey: JsonWebKey } | null {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!publicKey || !privateKey) {
    console.error("VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not configured");
    return null;
  }

  try {
    return rawKeysToJwk(publicKey, privateKey);
  } catch (error) {
    console.error("Failed to convert VAPID keys to JWK:", error);
    return null;
  }
}
