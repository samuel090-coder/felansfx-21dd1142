/**
 * Platform abstraction layer.
 *
 * Presentation code must never touch browser globals directly — it calls these
 * helpers instead. Each one already prefers the native Capacitor plugin when it
 * is available, and falls back to the web implementation otherwise, so adding
 * Android / iOS support later requires no changes in feature code.
 */
export * from "./storage";
export * from "./clipboard";
export * from "./sharing";
export * from "./network";
export * from "./links";
export * from "./media";
