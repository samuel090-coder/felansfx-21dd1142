import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    // Check if push notifications are supported
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);

    if (supported && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error("Error checking subscription:", error);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Notifications not supported");
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

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast.error("Push notifications not supported in this browser");
      return false;
    }
    
    if (!user) {
      toast.error("Please log in to enable notifications");
      return false;
    }

    try {
      // Request permission first
      const granted = await requestPermission();
      if (!granted) {
        toast.error("Notification permission denied. Please enable in browser settings.");
        return false;
      }

      // Wait for service worker to be ready
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/"
        });
        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;
      }

      // Get VAPID public key from edge function
      console.log("Fetching VAPID key...");
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke(
        "push-notifications",
        {
          body: { action: "get-vapid-key" },
        }
      );

      if (vapidError) {
        console.error("VAPID error:", vapidError);
        throw new Error("Failed to get VAPID key from server");
      }
      
      if (!vapidData?.publicKey) {
        console.error("No VAPID public key in response:", vapidData);
        throw new Error("Push notifications not configured on server");
      }

      console.log("VAPID key received, subscribing...");
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const subscriptionJson = subscription.toJSON();

      // Save subscription to database
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint!,
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth,
      }, {
        onConflict: "user_id,endpoint"
      });

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      setIsSubscribed(true);
      toast.success("Push notifications enabled successfully");
      return true;
    } catch (error: any) {
      console.error("Error subscribing:", error);
      toast.error(error.message || "Failed to enable push notifications");
      return false;
    }
  }, [isSupported, user, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
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
      console.error("Error unsubscribing:", error);
      toast.error("Failed to disable push notifications");
      return false;
    }
  }, [isSupported, user]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    requestPermission,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
