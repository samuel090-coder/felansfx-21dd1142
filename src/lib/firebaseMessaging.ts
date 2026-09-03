import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  deleteToken,
  isSupported,
  onMessage,
  type Messaging,
  type MessagePayload,
} from "firebase/messaging";

const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID as string | undefined;
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY as string | undefined;

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY as string | undefined,
  projectId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID as string | undefined,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export const SW_PATH = "/firebase-messaging-sw.js";
export const FCM_TOKEN_STORAGE_KEY = "fcm_token";

export type PushResult =
  | { status: "registered"; token: string }
  | { status: "not-configured" | "unsupported" | "open-in-new-tab" | "denied" };

export const isFcmConfigured = () =>
  Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      appId &&
      vapidKey &&
      firebaseConfig.messagingSenderId,
  );

export const isInIframe = () => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

const getApp = () => {
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
};

export const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (!isFcmConfigured()) return null;
  if (!(await isSupported())) return null;
  if (!messaging) messaging = getMessaging(getApp());
  return messaging;
};

const registerServiceWorker = async () => {
  const query = new URLSearchParams(firebaseConfig as Record<string, string>).toString();
  return navigator.serviceWorker.register(`${SW_PATH}?${query}`);
};

export const getExistingRegistration = async () => {
  if (!("serviceWorker" in navigator)) return null;
  const regs = await navigator.serviceWorker.getRegistrations();
  return regs.find((r) => r.active?.scriptURL.includes(SW_PATH) || r.installing?.scriptURL.includes(SW_PATH) || r.waiting?.scriptURL.includes(SW_PATH)) ?? null;
};

/**
 * Enables push for this device. Must be called from a user gesture
 * (or when permission is already granted).
 */
export async function enablePush(): Promise<PushResult> {
  if (!isFcmConfigured()) return { status: "not-configured" };
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !(await isSupported())) {
    return { status: "unsupported" };
  }
  if (Notification.permission !== "granted" && isInIframe()) {
    return { status: "open-in-new-tab" };
  }

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const serviceWorkerRegistration = await registerServiceWorker();
  const m = await getMessagingInstance();
  if (!m) return { status: "unsupported" };

  const token = await getToken(m, { vapidKey, serviceWorkerRegistration });
  if (!token) return { status: "denied" };

  localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  return { status: "registered", token };
}

export async function disablePush(): Promise<string | null> {
  const token = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  try {
    const m = await getMessagingInstance();
    if (m) await deleteToken(m);
  } catch (err) {
    console.warn("deleteToken failed:", err);
  }
  localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
  return token;
}

/** Foreground messages (app open & focused). */
export async function onForegroundMessage(cb: (payload: MessagePayload) => void) {
  const m = await getMessagingInstance();
  if (!m) return () => {};
  return onMessage(m, cb);
}
