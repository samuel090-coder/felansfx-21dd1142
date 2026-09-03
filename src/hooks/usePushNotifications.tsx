import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  enablePush,
  disablePush,
  isFcmConfigured,
  onForegroundMessage,
  FCM_TOKEN_STORAGE_KEY,
  type PushResult,
} from "@/lib/firebaseMessaging";

const explainFailure = (status: Exclude<PushResult, { status: "registered" }>["status"]) => {
  switch (status) {
    case "open-in-new-tab":
      return "Open the app in its own browser tab to enable notifications.";
    case "denied":
      return "Notifications are blocked. Allow them in your browser's site settings.";
    case "not-configured":
      return "Push notifications are not configured yet.";
    default:
      return "Push notifications are not supported on this browser.";
  }
};

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(false);
  const silentSyncDone = useRef(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "Notification" in window &&
      isFcmConfigured();
    setIsSupported(supported);
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  const saveToken = useCallback(
    async (token: string) => {
      if (!user) return;
      const { error } = await supabase.from("fcm_tokens").upsert(
        {
          user_id: user.id,
          token,
          platform: "web",
          user_agent: navigator.userAgent.slice(0, 255),
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "token" },
      );
      if (error) throw error;
    },
    [user],
  );

  /** Registers (or refreshes) this device token. `silent` suppresses toasts. */
  const subscribe = useCallback(
    async (silent = false): Promise<boolean> => {
      if (!isSupported) {
        if (!silent) toast.error("Push notifications not supported on this device");
        return false;
      }
      if (!user) {
        if (!silent) toast.error("Please log in to enable notifications");
        return false;
      }

      setIsLoading(true);
      try {
        const result = await enablePush();
        if ("Notification" in window) setPermission(Notification.permission);

        if (result.status !== "registered") {
          if (!silent) toast.error(explainFailure(result.status));
          return false;
        }

        await saveToken(result.token);
        setIsSubscribed(true);
        if (!silent) toast.success("Push notifications enabled!");
        return true;
      } catch (error: any) {
        console.error("FCM subscribe error:", error);
        if (!silent) toast.error(error?.message || "Failed to enable notifications");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, user, saveToken],
  );

  // Ask for permission; if granted, register the token right away.
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") await subscribe(true);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting permission:", error);
      return false;
    }
  }, [subscribe]);

  // On load: if permission already granted, silently refresh the token so it
  // stays valid and is tied to the current user.
  useEffect(() => {
    if (!isSupported || !user || silentSyncDone.current) return;
    if (Notification.permission !== "granted") {
      setIsSubscribed(false);
      return;
    }
    silentSyncDone.current = true;
    subscribe(true);
  }, [isSupported, user, subscribe]);

  // Auto-refresh on login event
  useEffect(() => {
    const handleRefresh = () => {
      if (isSupported && user && Notification.permission === "granted") subscribe(true);
    };
    window.addEventListener("refresh-push-subscription", handleRefresh);
    return () => window.removeEventListener("refresh-push-subscription", handleRefresh);
  }, [isSupported, user, subscribe]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
    try {
      const token = await disablePush();
      if (token) await supabase.from("fcm_tokens").delete().eq("token", token);
      setIsSubscribed(false);
      toast.success("Push notifications disabled");
      return true;
    } catch (error) {
      console.error("Unsubscribe error:", error);
      toast.error("Failed to disable notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    subscribe,
    unsubscribe,
    requestPermission,
  };
};

/** Mount once (e.g. in AppLayout) to surface foreground pushes as toasts. */
export const useForegroundPushToasts = () => {
  useEffect(() => {
    let off: (() => void) | undefined;
    onForegroundMessage((payload) => {
      const d = payload.data || {};
      const title = d.title || payload.notification?.title;
      const body = d.body || payload.notification?.body;
      if (!title && !body) return;
      toast(title || "FelansFX", {
        description: body,
        action: d.url
          ? { label: "Open", onClick: () => (window.location.href = d.url) }
          : undefined,
      });
    }).then((unsub) => (off = unsub));
    return () => off?.();
  }, []);
};

export const hasLocalFcmToken = () => Boolean(localStorage.getItem(FCM_TOKEN_STORAGE_KEY));
