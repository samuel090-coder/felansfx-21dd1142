/** Connectivity detection shared by web and native builds. */

export const isOnline = (): boolean =>
  typeof navigator === "undefined" ? true : navigator.onLine !== false;

/** Subscribes to connectivity changes; returns an unsubscribe function. */
export function onNetworkChange(cb: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => cb(true);
  const handleOffline = () => cb(false);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  let removeNative: (() => void) | undefined;
  const native = (window as any).Capacitor?.Plugins?.Network;
  if (native?.addListener) {
    const handle = native.addListener("networkStatusChange", (s: any) =>
      cb(Boolean(s?.connected)),
    );
    removeNative = () => Promise.resolve(handle).then((h: any) => h?.remove?.());
  }

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    removeNative?.();
  };
}

/**
 * Retries an async call with exponential backoff — used for API requests so
 * flaky mobile connections recover instead of failing the whole screen.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, delayMs = 600 }: { retries?: number; delayMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, delayMs * 2 ** attempt));
    }
  }
  throw lastError;
}
