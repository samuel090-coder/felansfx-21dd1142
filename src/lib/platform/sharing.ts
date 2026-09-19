import { copyText } from "./clipboard";

export type SharePayload = {
  title?: string;
  text?: string;
  url: string;
};

export type ShareResult = "shared" | "copied" | "failed";

/**
 * Shares a link using the native share sheet when available, otherwise copies
 * it to the clipboard. Works the same in web, PWA and native builds.
 */
export async function shareLink(payload: SharePayload): Promise<ShareResult> {
  try {
    const native = (window as any).Capacitor?.Plugins?.Share;
    if (native?.share) {
      await native.share(payload);
      return "shared";
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(payload);
      return "shared";
    }
  } catch (err: any) {
    // The user dismissing the sheet is not an error worth reporting.
    if (err?.name === "AbortError") return "shared";
  }

  return (await copyText(payload.url)) ? "copied" : "failed";
}
