/// <reference types="vite/client" />

// Extend ServiceWorkerRegistration to include PushManager
interface PushManager {
  getSubscription(): Promise<PushSubscription | null>;
  subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription>;
  permissionState(options?: PushSubscriptionOptionsInit): Promise<PushPermissionState>;
}

interface ServiceWorkerRegistration {
  pushManager: PushManager;
}
