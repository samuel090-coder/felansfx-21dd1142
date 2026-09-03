// Shared helper for sending push notifications (Firebase Cloud Messaging)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isFcmConfigured, sendFcmToTokens } from "./fcm.ts";

export interface PushNotificationOptions {
  userIds?: string[];
  title: string;
  message: string;
  url?: string;
  type?: "info" | "success" | "warning" | "error";
  /** Also insert an in-app notification row (default true). */
  createInApp?: boolean;
}

export async function sendPushNotifications(
  options: PushNotificationOptions
): Promise<{ sent: number; failed: number; cleaned: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { userIds, title, message, url = "/", type = "info", createInApp = true } = options;
  const result = { sent: 0, failed: 0, cleaned: 0 };

  try {
    let tokenQuery = supabase.from("fcm_tokens").select("id, user_id, token");
    if (userIds && userIds.length > 0) tokenQuery = tokenQuery.in("user_id", userIds);
    const { data: tokenRows, error: tokenErr } = await tokenQuery;
    if (tokenErr) console.error("Failed to load fcm_tokens:", tokenErr);

    const rows = tokenRows ?? [];
    const targetUserIds =
      userIds && userIds.length > 0 ? userIds : [...new Set(rows.map((r: any) => r.user_id as string))];

    if (createInApp && targetUserIds.length > 0) {
      await supabase.from("notifications").insert(
        targetUserIds.map((userId: string) => ({
          user_id: userId,
          title,
          message,
          type,
          action_url: url,
        }))
      );
    }

    if (!isFcmConfigured()) {
      console.log("FCM not configured; skipped push delivery");
      return result;
    }
    if (rows.length === 0) return result;

    const send = await sendFcmToTokens(rows.map((r: any) => r.token as string), { title, body: message, url });
    result.sent = send.sent;
    result.failed = send.failed;

    if (send.staleTokens.length > 0) {
      await supabase.from("fcm_tokens").delete().in("token", send.staleTokens);
      result.cleaned = send.staleTokens.length;
    }

    console.log(`Push: ${result.sent} sent, ${result.failed} failed, ${result.cleaned} cleaned`);
  } catch (error) {
    console.error("Error sending push notifications:", error);
  }

  return result;
}
