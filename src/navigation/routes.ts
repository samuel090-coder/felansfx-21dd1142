import { lazy, type LazyExoticComponent } from "react";

/**
 * Single source of truth for navigation.
 *
 * `kind` describes how each screen maps onto native navigation later:
 *  - "tab"    → bottom tab navigator root
 *  - "stack"  → pushed screen inside a stack
 *  - "public" → reachable without a session (auth, payment, shared links)
 *
 * Every screen is code-split so the first paint stays small on mobile data.
 */
export type NavKind = "tab" | "stack" | "public";

export interface AppRoute {
  /** Router path — also the deep-link path (`felansfx://<path>`). */
  path: string;
  title: string;
  kind: NavKind;
  /** Requires a session + access check. */
  guarded: boolean;
  component: LazyExoticComponent<React.ComponentType<any>>;
}

export const routes: AppRoute[] = [
  // Public
  { path: "/auth", title: "Sign in", kind: "public", guarded: false, component: lazy(() => import("@/pages/Auth")) },
  { path: "/auth/callback", title: "Signing in", kind: "public", guarded: false, component: lazy(() => import("@/pages/AuthCallback")) },
  { path: "/deposit", title: "Deposit", kind: "public", guarded: false, component: lazy(() => import("@/pages/Deposit")) },

  // Tabs
  { path: "/", title: "Home", kind: "tab", guarded: true, component: lazy(() => import("@/pages/Index")) },
  { path: "/feed", title: "Feed", kind: "tab", guarded: true, component: lazy(() => import("@/pages/Feed")) },
  { path: "/saved", title: "Saved", kind: "tab", guarded: true, component: lazy(() => import("@/pages/Saved")) },
  { path: "/daily-streak", title: "Streak", kind: "tab", guarded: true, component: lazy(() => import("@/pages/DailyStreak")) },
  { path: "/profile", title: "Profile", kind: "tab", guarded: true, component: lazy(() => import("@/pages/Profile")) },

  // Stack screens
  { path: "/analyze", title: "Analyze", kind: "stack", guarded: true, component: lazy(() => import("@/pages/Analyze")) },
  { path: "/analysis/compare", title: "Compare", kind: "stack", guarded: true, component: lazy(() => import("@/pages/AnalysisCompare")) },
  { path: "/analysis/:id", title: "Analysis", kind: "stack", guarded: true, component: lazy(() => import("@/pages/AnalysisResult")) },
  { path: "/history", title: "History", kind: "stack", guarded: true, component: lazy(() => import("@/pages/AnalysisHistory")) },
  { path: "/admin", title: "Admin", kind: "stack", guarded: true, component: lazy(() => import("@/pages/Admin")) },
  { path: "/patterns", title: "Patterns", kind: "stack", guarded: true, component: lazy(() => import("@/pages/Patterns")) },
  { path: "/notifications", title: "Notifications", kind: "stack", guarded: true, component: lazy(() => import("@/pages/Notifications")) },
  { path: "/notification-settings", title: "Notification settings", kind: "stack", guarded: true, component: lazy(() => import("@/pages/NotificationSettings")) },
  { path: "/screenshot-guide", title: "Screenshot guide", kind: "stack", guarded: true, component: lazy(() => import("@/pages/ScreenshotGuide")) },
  { path: "/trading", title: "Live trading", kind: "stack", guarded: true, component: lazy(() => import("@/pages/Trading")) },
  { path: "/withdraw", title: "Withdraw", kind: "stack", guarded: true, component: lazy(() => import("@/pages/Withdraw")) },
  { path: "/withdrawal-challenge", title: "Withdrawal challenge", kind: "stack", guarded: true, component: lazy(() => import("@/pages/WithdrawalChallenge")) },
  { path: "/invite", title: "Invite", kind: "stack", guarded: true, component: lazy(() => import("@/pages/Invite")) },
  { path: "/help", title: "Help", kind: "stack", guarded: true, component: lazy(() => import("@/pages/Help")) },
  { path: "/school", title: "Academy", kind: "stack", guarded: true, component: lazy(() => import("@/pages/SchoolHub")) },
  { path: "/kyc", title: "Verification", kind: "stack", guarded: true, component: lazy(() => import("@/pages/KYC")) },
  { path: "/trade/:id", title: "Trade", kind: "stack", guarded: true, component: lazy(() => import("@/pages/TradeDetail")) },
  { path: "/chat-rooms", title: "Chat rooms", kind: "stack", guarded: true, component: lazy(() => import("@/pages/ChatRooms")) },
  { path: "/chat/:id", title: "Chat", kind: "stack", guarded: true, component: lazy(() => import("@/pages/ChatRoom")) },
  { path: "/send-funds", title: "Send funds", kind: "stack", guarded: true, component: lazy(() => import("@/pages/SendFunds")) },
];

/** Paths shown in the bottom tab bar, in order. */
export const tabPaths = routes.filter((r) => r.kind === "tab").map((r) => r.path);
