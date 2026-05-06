import { supabase } from "@/integrations/supabase/client";

export type EmailType =
  | "payment_approved" | "payment_declined" | "code_purchased"
  | "deposit_approved" | "deposit_declined"
  | "withdrawal_approved" | "withdrawal_declined"
  | "win_pool" | "win_game" | "pool_lost" | "pool_refunded"
  | "new_follower" | "profile_viewed" | "post_liked" | "post_commented"
  | "post_shared" | "comment_reply" | "comment_liked" | "mentioned_in_comment"
  | "milestone_followers"
  | "room_invite" | "room_tagged" | "room_join_request" | "room_join_approved" | "room_join_declined"
  | "level_up" | "challenge_completed" | "streak_milestone"
  | "wallet_credit" | "wallet_debit" | "p2p_received" | "p2p_sent"
  | "money_request_received" | "money_request_accepted" | "money_request_declined"
  | "weekly_summary" | "referral_bonus" | "referral_milestone" | "vip_expiring"
  | "account_created" | "login_alert" | "password_changed" | "pin_changed"
  | "kyc_submitted" | "kyc_approved" | "kyc_rejected"
  | "trade_won" | "trade_lost" | "losing_streak_alert"
  | "signal_published" | "signal_redeemed"
  | "copy_started" | "copy_stopped" | "copy_trade_executed"
  | "subscription_activated" | "subscription_expired"
  | "analysis_ready" | "admin_broadcast" | "report_received" | "fraud_alert"
  | "test_email";

export interface SendEmailArgs {
  type: EmailType;
  userEmail: string;
  data?: Record<string, any>;
  userId?: string;
  shortId?: string;
  previewOnly?: boolean;
}

/**
 * Fire-and-forget email send via EmailJS through the `send-email` edge function.
 * Errors are logged but never thrown — emails should never break user flows.
 */
export async function sendEmail(args: SendEmailArgs): Promise<{ success: boolean; html?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", { body: args });
    if (error) {
      console.warn("[sendEmail] failed:", error.message);
      return { success: false, error: error.message };
    }
    return data;
  } catch (e: any) {
    console.warn("[sendEmail] threw:", e?.message);
    return { success: false, error: e?.message };
  }
}
