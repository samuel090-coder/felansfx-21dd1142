/**
 * Centralised application configuration.
 *
 * Every absolute URL, deep-link scheme and platform flag lives here so the
 * same codebase can run in a browser, an installed PWA or inside a native
 * Capacitor shell (Android / iOS) without code changes.
 */

const FALLBACK_WEB_URL = "https://felansfx.lovable.app";

const originIsHttp =
  typeof window !== "undefined" && /^https?:$/.test(window.location.protocol);

/** Canonical public web origin — always an https URL, safe for sharing/SEO. */
export const APP_URL: string =
  (import.meta.env.VITE_APP_URL as string | undefined) ||
  (originIsHttp ? window.location.origin : FALLBACK_WEB_URL);

/** Custom scheme used by the native apps for deep links. */
export const APP_SCHEME = "felansfx";

/** Native bundle identifier (kept in sync with capacitor.config.ts). */
export const APP_ID = "app.lovable.p76ac4beb48ff4e91b62c9071ff36c1ea";
export const APP_NAME = "FelansFX";

/** True when running inside the native Capacitor shell. */
export const isNativePlatform = (): boolean =>
  typeof window !== "undefined" &&
  Boolean((window as any).Capacitor?.isNativePlatform?.());

/** True when running as an installed PWA (standalone display mode). */
export const isStandalone = (): boolean =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true);

/** True inside an iframe (e.g. the Lovable preview) — permissions are limited. */
export const isEmbedded = (): boolean => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
};

/** Builds a shareable universal link that also opens the native app. */
export const buildLink = (path: string, params?: Record<string, string>) => {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  return `${APP_URL}${clean}${qs}`;
};

/** OAuth / email callback target. Native builds use the universal link. */
export const authRedirectUrl = (path = "/auth/callback") => buildLink(path);
