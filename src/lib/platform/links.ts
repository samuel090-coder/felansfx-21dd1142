import { isNativePlatform } from "@/config/app";

/**
 * Opens an external URL. In a native shell this hands off to the system
 * browser / mail client instead of navigating the webview away from the app.
 */
export async function openExternal(url: string): Promise<void> {
  const native = (window as any).Capacitor?.Plugins?.Browser;
  const isMailOrTel = /^(mailto:|tel:|sms:|whatsapp:)/i.test(url);

  if (isNativePlatform() && !isMailOrTel && native?.open) {
    await native.open({ url });
    return;
  }

  if (isMailOrTel) {
    window.location.href = url;
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Turns an incoming universal link or custom-scheme deep link into an
 * in-app path that the router can navigate to.
 */
export function deepLinkToPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path === "" ? "/" : path;
  } catch {
    return url.startsWith("/") ? url : null;
  }
}
