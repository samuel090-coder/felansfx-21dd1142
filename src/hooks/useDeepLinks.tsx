import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { deepLinkToPath } from "@/lib/platform";

/** Event any feature can fire to navigate (push taps, notifications, native). */
export const APP_NAVIGATE_EVENT = "app-navigate";

export const requestNavigation = (target: string) => {
  window.dispatchEvent(new CustomEvent(APP_NAVIGATE_EVENT, { detail: { target } }));
};

/**
 * Routes universal links, custom-scheme deep links and in-app navigation
 * requests through the router — never through a full page load, so the native
 * app keeps its navigation stack intact.
 */
export const useDeepLinks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const go = (raw?: string) => {
      if (!raw) return;
      const path = deepLinkToPath(raw);
      if (path) navigate(path);
    };

    const onAppNavigate = (e: Event) => go((e as CustomEvent).detail?.target);
    window.addEventListener(APP_NAVIGATE_EVENT, onAppNavigate);

    // Native deep links (Capacitor App plugin), when running in a shell.
    let removeNative: (() => void) | undefined;
    const nativeApp = (window as any).Capacitor?.Plugins?.App;
    if (nativeApp?.addListener) {
      const handle = nativeApp.addListener("appUrlOpen", (data: any) => go(data?.url));
      removeNative = () => Promise.resolve(handle).then((h: any) => h?.remove?.());
    }

    return () => {
      window.removeEventListener(APP_NAVIGATE_EVENT, onAppNavigate);
      removeNative?.();
    };
  }, [navigate]);
};
