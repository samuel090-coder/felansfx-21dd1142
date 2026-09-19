/**
 * Key/value storage that works in the browser, in a PWA and in a native shell.
 * Native builds can swap the driver for @capacitor/preferences without touching
 * any calling code (the async API is already shaped for it).
 */

type Driver = {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
};

const memory = new Map<string, string>();

const memoryDriver: Driver = {
  get: (k) => memory.get(k) ?? null,
  set: (k, v) => void memory.set(k, v),
  remove: (k) => void memory.delete(k),
};

const webDriver: Driver = {
  get: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return memoryDriver.get(k);
    }
  },
  set: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      memoryDriver.set(k, v);
    }
  },
  remove: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      memoryDriver.remove(k);
    }
  },
};

const driver: Driver = typeof window === "undefined" ? memoryDriver : webDriver;

export const storage = {
  get: (key: string) => driver.get(key),
  set: (key: string, value: string) => driver.set(key, value),
  remove: (key: string) => driver.remove(key),
  getJSON: <T,>(key: string, fallback: T): T => {
    const raw = driver.get(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  setJSON: (key: string, value: unknown) => {
    try {
      driver.set(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
};

/** Session-scoped values (splash screens, one-off notices). */
export const sessionStore = {
  get: (key: string) => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return memoryDriver.get(key);
    }
  },
  set: (key: string, value: string) => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      memoryDriver.set(key, value);
    }
  },
};
