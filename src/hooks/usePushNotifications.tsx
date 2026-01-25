import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(false);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        "serviceWorker" in navigator && 
        "PushManager" in window &&
        "Notification" in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };
    
    checkSupport();
  }, []);

  // Check existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error("Error checking push subscription:", error);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast.error("Notifications not supported in this browser");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting permission:", error);
      return false;
    }
  }, []);

  // Convert VAPID key for use with push subscription
  const urlBase64ToUint8Array = (base64String: string): ArrayBuffer => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray.buffer as ArrayBuffer;
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error("Push notifications not supported");
      return false;
    }

    if (!user) {
      toast.error("Please log in to enable notifications");
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission first
      const granted = await requestPermission();
      if (!granted) {
        toast.error("Permission denied. Enable notifications in browser settings.");
        return false;
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        await navigator.serviceWorker.ready;
      }

      // Get VAPID public key from server
      console.log("Fetching VAPID key from server...");
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke(
        "push-notifications",
        { body: { action: "get-vapid-key" } }
      );

      if (vapidError || !vapidData?.publicKey) {
        console.error("VAPID key error:", vapidError || "No public key returned");
        throw new Error("Failed to get push configuration");
      }

      console.log("VAPID key received, creating subscription...");

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const subscriptionJson = subscription.toJSON();

      // Save subscription to database
      const { error: dbError } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys!.p256dh,
          auth: subscriptionJson.keys!.auth,
        },
        { onConflict: "user_id,endpoint" }
      );

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error("Failed to save subscription");
      }

      setIsSubscribed(true);
      toast.success("Push notifications enabled!");
      return true;
    } catch (error: any) {
      console.error("Subscribe error:", error);
      toast.error(error.message || "Failed to enable notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) return false;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }

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
  }, [isSupported, user]);

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
