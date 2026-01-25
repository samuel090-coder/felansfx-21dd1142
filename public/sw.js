// Service Worker for Push Notifications
// Version 2.0 - Complete rebuild

const CACHE_NAME = "fxlens-v2";

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker v2...");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker v2...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Push notification event
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");
  
  let data = {
    title: "FxLens",
    body: "You have a new notification",
    icon: "/favicon-512.png",
    badge: "/favicon-512.png",
    url: "/",
  };

  // Try to parse push data
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        url: payload.url || data.url,
      };
    } catch (e) {
      console.error("[SW] Error parsing push data:", e);
      // Try as text
      try {
        data.body = event.data.text();
      } catch (textError) {
        console.error("[SW] Error getting text data:", textError);
      }
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: data.url,
    },
    actions: [
      {
        action: "open",
        title: "Open",
      },
      {
        action: "close",
        title: "Close",
      },
    ],
    requireInteraction: true,
    tag: "fxlens-notification",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  if (event.action === "close") {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      
      // Open a new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Push subscription change event
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW] Push subscription changed");
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
    }).then((subscription) => {
      console.log("[SW] Re-subscribed after change");
    }).catch((error) => {
      console.error("[SW] Re-subscription failed:", error);
    })
  );
});
