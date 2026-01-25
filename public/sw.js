// Service Worker for Push Notifications
self.addEventListener("install", (event) => {
  console.log("Service Worker installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activated");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("Push message received:", event.data?.text());

  let data = {
    title: "Notification",
    body: "You have a new notification",
    url: "/",
    icon: "/favicon.ico",
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error("Error parsing push data:", e);
  }

  const options = {
    body: data.body,
    icon: data.icon || "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: data.url },
    vibrate: [100, 50, 100],
    actions: [
      { action: "open", title: "View" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event.action);
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
