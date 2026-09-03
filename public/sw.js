// Kill-switch for the retired VAPID push worker.
// Push is now handled by /firebase-messaging-sw.js. This worker removes the
// old registration and its caches for returning visitors, then unregisters itself.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(
          names.filter((n) => n.startsWith("fxlens-")).map((n) => caches.delete(n))
        );
        const sub = await self.registration.pushManager?.getSubscription?.();
        if (sub) await sub.unsubscribe();
      } finally {
        await self.registration.unregister();
      }
    })()
  )
);
