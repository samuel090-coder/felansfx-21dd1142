// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://felansfx.lovable.app";
const BRAND_NAME = "Felans FX";
const BRAND_PRIMARY = "#0d9488"; // teal-600
const BRAND_ACCENT = "#06b6d4"; // cyan-500
const LOGO_URL = `${APP_URL}/icon-192.png`;

// ---- Image proxy (Gmail/Outlook strip Supabase URLs) ----
function proxyImage(url: string | null | undefined, width = 200): string {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  const clean = url.replace(/^https?:\/\//, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(clean)}&w=${width}&output=jpg`;
}

function fmtMoney(n: number | string | null | undefined, currency = "NGN"): string {
  const v = Number(n ?? 0);
  if (currency === "NGN") return `₦${v.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
  return `${currency} ${v.toLocaleString()}`;
}

function escapeHtml(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---- Shared HTML shell ----
function emailShell(opts: {
  preheader?: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  recipientEmail: string;
}): string {
  const { preheader = "", title, bodyHtml, ctaLabel, ctaUrl, recipientEmail } = opts;
  const cta = ctaLabel && ctaUrl
    ? `<tr><td align="center" style="padding:8px 0 28px;">
        <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:linear-gradient(135deg,${BRAND_PRIMARY},${BRAND_ACCENT});color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 4px 12px rgba(13,148,136,.3);">${escapeHtml(ctaLabel)}</a>
       </td></tr>` : "";
  const unsubUrl = `${APP_URL}/notifications?unsubscribe=${encodeURIComponent(recipientEmail)}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f4f6f8;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.06);">
      <tr><td style="background:linear-gradient(135deg,${BRAND_PRIMARY} 0%,${BRAND_ACCENT} 100%);padding:28px 32px;text-align:center;">
        <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="56" height="56" style="display:block;margin:0 auto 8px;border-radius:14px;">
        <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.3px;">${BRAND_NAME}</div>
      </td></tr>
      <tr><td style="padding:32px 32px 8px;">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;font-weight:700;">${escapeHtml(title)}</h1>
        <div style="font-size:15px;line-height:1.6;color:#334155;">${bodyHtml}</div>
      </td></tr>
      ${cta}
      <tr><td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;">
        <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-align:center;">You're receiving this because you have an account at ${BRAND_NAME}.</p>
        <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
          <a href="${APP_URL}" style="color:${BRAND_PRIMARY};text-decoration:none;">Open app</a> ·
          <a href="${escapeHtml(unsubUrl)}" style="color:#94a3b8;text-decoration:none;">Manage notifications</a>
        </p>
        <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;text-align:center;">© ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

// ---- Profile card builder ----
function profileCard(p: any): string {
  if (!p) return "";
  const avatar = p.avatar_url
    ? `<img src="${proxyImage(p.avatar_url, 96)}" width="48" height="48" style="border-radius:50%;display:block;" alt="">`
    : `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,${BRAND_PRIMARY},${BRAND_ACCENT});color:#fff;display:inline-block;text-align:center;line-height:48px;font-weight:700;">${escapeHtml((p.full_name || "U").charAt(0).toUpperCase())}</div>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;width:100%;">
    <tr>
      <td width="60" valign="middle">${avatar}</td>
      <td valign="middle" style="padding-left:12px;">
        <div style="font-weight:600;color:#0f172a;font-size:15px;">${escapeHtml(p.full_name || "Trader")}</div>
        <div style="font-size:12px;color:#64748b;">@${escapeHtml(p.display_id || "user")}</div>
      </td>
    </tr>
  </table>`;
}

// ---- Post media thumbnail ----
function postThumb(post: any): string {
  if (!post) return "";
  const isVideo = !!post.video_url;
  const src = post.image_url || post.video_url;
  if (!src) return post.content
    ? `<blockquote style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid ${BRAND_PRIMARY};border-radius:6px;font-size:14px;color:#475569;font-style:italic;">${escapeHtml(post.content.slice(0, 180))}${post.content.length > 180 ? "…" : ""}</blockquote>`
    : "";
  const overlay = isVideo
    ? `<div style="position:relative;display:inline-block;"><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:48px;height:48px;background:rgba(0,0,0,.6);border-radius:50%;color:#fff;text-align:center;line-height:48px;font-size:20px;">▶</div></div>`
    : "";
  return `<div style="margin:16px 0;text-align:center;">
    <img src="${proxyImage(src, 480)}" alt="" style="max-width:100%;border-radius:12px;border:1px solid #e2e8f0;">
    ${overlay}
  </div>`;
}

// ---- Email type registry ----
type Ctx = {
  recipientEmail: string;
  data: Record<string, any>;
  profile?: any;
  post?: any;
};

const REGISTRY: Record<string, (c: Ctx) => { subject: string; title: string; body: string; cta?: { label: string; url: string } }> = {
  // ---- Transactional ----
  payment_approved: (c) => ({
    subject: `Payment approved — ${fmtMoney(c.data.amount)}`,
    title: "Your payment has been approved ✅",
    body: `<p>Great news! Your payment of <strong>${fmtMoney(c.data.amount)}</strong> has been approved and credited to your account.</p>${c.data.reference ? `<p style="color:#64748b;font-size:13px;">Reference: <code>${escapeHtml(c.data.reference)}</code></p>` : ""}`,
    cta: { label: "View Wallet", url: `${APP_URL}/wallet` },
  }),
  payment_declined: (c) => ({
    subject: "Payment declined",
    title: "Payment couldn't be processed",
    body: `<p>We were unable to process your payment of <strong>${fmtMoney(c.data.amount)}</strong>.</p>${c.data.reason ? `<p style="color:#dc2626;">Reason: ${escapeHtml(c.data.reason)}</p>` : ""}<p>Please try again or contact support.</p>`,
    cta: { label: "Try Again", url: `${APP_URL}/wallet` },
  }),
  code_purchased: (c) => ({
    subject: "Access code purchased",
    title: "Your access code is ready 🎉",
    body: `<p>Your purchase was successful. Here is your access code:</p><div style="margin:16px 0;padding:16px;background:#f1f5f9;border-radius:10px;text-align:center;font-family:monospace;font-size:20px;font-weight:700;color:${BRAND_PRIMARY};letter-spacing:2px;">${escapeHtml(c.data.code || "—")}</div>`,
    cta: { label: "Open App", url: APP_URL },
  }),
  deposit_approved: (c) => ({
    subject: `Deposit approved — ${fmtMoney(c.data.amount)}`,
    title: "Deposit approved 💰",
    body: `<p>Your deposit of <strong>${fmtMoney(c.data.amount)}</strong> has been confirmed and added to your wallet.</p>`,
    cta: { label: "View Wallet", url: `${APP_URL}/wallet` },
  }),
  deposit_declined: (c) => ({
    subject: "Deposit declined",
    title: "Deposit couldn't be approved",
    body: `<p>Your deposit of <strong>${fmtMoney(c.data.amount)}</strong> couldn't be verified.</p>${c.data.reason ? `<p style="color:#dc2626;">${escapeHtml(c.data.reason)}</p>` : ""}`,
    cta: { label: "Try Again", url: `${APP_URL}/wallet` },
  }),
  withdrawal_approved: (c) => ({
    subject: `Withdrawal approved — ${fmtMoney(c.data.amount)}`,
    title: "Withdrawal sent 🏦",
    body: `<p>Your withdrawal of <strong>${fmtMoney(c.data.amount)}</strong> has been approved and is on its way to your bank account.</p>`,
    cta: { label: "View Transactions", url: `${APP_URL}/wallet` },
  }),
  withdrawal_declined: (c) => ({
    subject: "Withdrawal declined",
    title: "Withdrawal couldn't be processed",
    body: `<p>Your withdrawal of <strong>${fmtMoney(c.data.amount)}</strong> was declined.</p>${c.data.reason ? `<p style="color:#dc2626;">${escapeHtml(c.data.reason)}</p>` : ""}<p>Funds remain in your wallet.</p>`,
    cta: { label: "View Wallet", url: `${APP_URL}/wallet` },
  }),

  // ---- Wins ----
  win_pool: (c) => ({
    subject: `🏆 You won the pool — ${fmtMoney(c.data.amount)}`,
    title: "Pool victory! 🏆",
    body: `<p>Congratulations! You won the <strong>${escapeHtml(c.data.pool_name || "pool")}</strong> and earned <strong>${fmtMoney(c.data.amount)}</strong>.</p>`,
    cta: { label: "Claim Winnings", url: `${APP_URL}/wallet` },
  }),
  win_game: (c) => ({
    subject: `🎮 You won — ${fmtMoney(c.data.amount)}`,
    title: "Game won! 🎮",
    body: `<p>Nice play! You won <strong>${fmtMoney(c.data.amount)}</strong> in <strong>${escapeHtml(c.data.game_name || "the game")}</strong>.</p>`,
    cta: { label: "Play Again", url: `${APP_URL}/chat` },
  }),
  pool_lost: (c) => ({
    subject: "Pool ended",
    title: "Better luck next time",
    body: `<p>The <strong>${escapeHtml(c.data.pool_name || "pool")}</strong> has ended. You didn't win this round, but more pools are available now.</p>`,
    cta: { label: "Join New Pool", url: `${APP_URL}/chat` },
  }),
  pool_refunded: (c) => ({
    subject: `Pool refunded — ${fmtMoney(c.data.amount)}`,
    title: "Pool refund issued",
    body: `<p>The pool was cancelled and your stake of <strong>${fmtMoney(c.data.amount)}</strong> has been returned to your wallet.</p>`,
    cta: { label: "View Wallet", url: `${APP_URL}/wallet` },
  }),

  // ---- Social ----
  new_follower: (c) => ({
    subject: `${c.profile?.full_name || "Someone"} started following you`,
    title: "You have a new follower 👋",
    body: `${profileCard(c.profile)}<p>Check out their profile and follow them back if you like their content.</p>`,
    cta: { label: "View Profile", url: `${APP_URL}/profile/${c.profile?.user_id || ""}` },
  }),
  profile_viewed: (c) => ({
    subject: `${c.profile?.full_name || "Someone"} viewed your profile`,
    title: "Someone checked you out 👀",
    body: `${profileCard(c.profile)}<p>People are noticing you. Keep posting great content!</p>`,
    cta: { label: "View Your Profile", url: `${APP_URL}/profile` },
  }),
  post_liked: (c) => ({
    subject: `${c.profile?.full_name || "Someone"} liked your post`,
    title: "Your post got a like ❤️",
    body: `${profileCard(c.profile)}${postThumb(c.post)}`,
    cta: { label: "View Post", url: `${APP_URL}/feed` },
  }),
  post_commented: (c) => ({
    subject: `${c.profile?.full_name || "Someone"} commented on your post`,
    title: "New comment on your post 💬",
    body: `${profileCard(c.profile)}${c.data.comment ? `<blockquote style="margin:12px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid ${BRAND_PRIMARY};border-radius:6px;font-size:14px;color:#475569;">${escapeHtml(c.data.comment)}</blockquote>` : ""}${postThumb(c.post)}`,
    cta: { label: "Reply", url: `${APP_URL}/feed` },
  }),
  post_shared: (c) => ({
    subject: `${c.profile?.full_name || "Someone"} shared your post`,
    title: "Your post was shared 🔁",
    body: `${profileCard(c.profile)}${postThumb(c.post)}`,
    cta: { label: "View Post", url: `${APP_URL}/feed` },
  }),
  comment_reply: (c) => ({
    subject: `${c.profile?.full_name || "Someone"} replied to your comment`,
    title: "New reply to your comment 💬",
    body: `${profileCard(c.profile)}${c.data.reply ? `<blockquote style="margin:12px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid ${BRAND_PRIMARY};border-radius:6px;font-size:14px;">${escapeHtml(c.data.reply)}</blockquote>` : ""}`,
    cta: { label: "View Reply", url: `${APP_URL}/feed` },
  }),
  comment_liked: (c) => ({
    subject: `${c.profile?.full_name || "Someone"} liked your comment`,
    title: "Your comment got a like ❤️",
    body: `${profileCard(c.profile)}`,
    cta: { label: "View", url: `${APP_URL}/feed` },
  }),
  mentioned_in_comment: (c) => ({
    subject: `${c.profile?.full_name || "Someone"} mentioned you`,
    title: "You were mentioned 🔔",
    body: `${profileCard(c.profile)}${c.data.comment ? `<blockquote style="margin:12px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid ${BRAND_PRIMARY};border-radius:6px;font-size:14px;">${escapeHtml(c.data.comment)}</blockquote>` : ""}`,
    cta: { label: "View Conversation", url: `${APP_URL}/feed` },
  }),
  milestone_followers: (c) => ({
    subject: `🎉 You hit ${c.data.count} followers!`,
    title: `${c.data.count} followers! 🎉`,
    body: `<p>Amazing milestone! Your community is growing — keep sharing your trades and insights.</p>`,
    cta: { label: "View Profile", url: `${APP_URL}/profile` },
  }),

  // ---- Rooms ----
  room_invite: (c) => ({
    subject: `You're invited to ${c.data.room_name || "a chat room"}`,
    title: "Room invitation 🚪",
    body: `${profileCard(c.profile)}<p><strong>${escapeHtml(c.profile?.full_name || "Someone")}</strong> invited you to join <strong>${escapeHtml(c.data.room_name || "their room")}</strong>.</p>`,
    cta: { label: "Join Room", url: `${APP_URL}/chat/${c.data.room_id || ""}` },
  }),
  room_tagged: (c) => ({
    subject: `You were tagged in ${c.data.room_name || "a room"}`,
    title: "You were tagged 🏷️",
    body: `${profileCard(c.profile)}<p>Someone mentioned you in <strong>${escapeHtml(c.data.room_name || "a chat room")}</strong>.</p>`,
    cta: { label: "Open Room", url: `${APP_URL}/chat/${c.data.room_id || ""}` },
  }),

  // ---- Gamification ----
  level_up: (c) => ({
    subject: `🎯 Level up! You're now level ${c.data.level}`,
    title: `Level ${c.data.level} unlocked! 🎯`,
    body: `<p>You leveled up by being active and consistent. New perks await!</p>`,
    cta: { label: "View Achievements", url: `${APP_URL}/profile` },
  }),
  challenge_completed: (c) => ({
    subject: `Challenge completed: ${c.data.challenge_name || ""}`,
    title: "Challenge crushed 🏅",
    body: `<p>You completed <strong>${escapeHtml(c.data.challenge_name || "the challenge")}</strong>${c.data.reward ? ` and earned <strong>${fmtMoney(c.data.reward)}</strong>` : ""}.</p>`,
    cta: { label: "View Challenges", url: `${APP_URL}/profile` },
  }),
  streak_milestone: (c) => ({
    subject: `🔥 ${c.data.days}-day streak!`,
    title: `${c.data.days}-day streak! 🔥`,
    body: `<p>You've been showing up every day. Don't break the chain!</p>`,
    cta: { label: "Keep It Up", url: APP_URL },
  }),

  // ---- Money ----
  wallet_credit: (c) => ({
    subject: `Wallet credited — ${fmtMoney(c.data.amount)}`,
    title: "Funds added to your wallet 💵",
    body: `<p><strong>${fmtMoney(c.data.amount)}</strong> was credited to your wallet.</p>${c.data.note ? `<p style="color:#64748b;">${escapeHtml(c.data.note)}</p>` : ""}`,
    cta: { label: "View Wallet", url: `${APP_URL}/wallet` },
  }),
  wallet_debit: (c) => ({
    subject: `Wallet debited — ${fmtMoney(c.data.amount)}`,
    title: "Wallet debit notice",
    body: `<p><strong>${fmtMoney(c.data.amount)}</strong> was debited from your wallet.</p>${c.data.note ? `<p style="color:#64748b;">${escapeHtml(c.data.note)}</p>` : ""}`,
    cta: { label: "View Wallet", url: `${APP_URL}/wallet` },
  }),
  p2p_received: (c) => ({
    subject: `${c.profile?.full_name || "Someone"} sent you ${fmtMoney(c.data.amount)}`,
    title: "Money received 💸",
    body: `${profileCard(c.profile)}<p>You received <strong>${fmtMoney(c.data.amount)}</strong>${c.data.note ? `: <em>"${escapeHtml(c.data.note)}"</em>` : ""}.</p>`,
    cta: { label: "View Wallet", url: `${APP_URL}/wallet` },
  }),
  p2p_sent: (c) => ({
    subject: `Sent ${fmtMoney(c.data.amount)} to ${c.profile?.full_name || "user"}`,
    title: "Transfer confirmed",
    body: `${profileCard(c.profile)}<p>Your transfer of <strong>${fmtMoney(c.data.amount)}</strong> was successful.</p>`,
    cta: { label: "View Receipt", url: `${APP_URL}/wallet` },
  }),
  weekly_summary: (c) => ({
    subject: `Your week at ${BRAND_NAME}`,
    title: "Your weekly summary 📊",
    body: `<p>Here's how your week went:</p>
      <ul style="font-size:14px;color:#334155;">
        <li>Trades: <strong>${c.data.trades ?? 0}</strong></li>
        <li>Win rate: <strong>${c.data.win_rate ?? 0}%</strong></li>
        <li>Net P&L: <strong>${fmtMoney(c.data.pnl ?? 0)}</strong></li>
      </ul>`,
    cta: { label: "Open Dashboard", url: APP_URL },
  }),
  referral_bonus: (c) => ({
    subject: `Referral bonus — ${fmtMoney(c.data.amount)} 🎁`,
    title: "Referral bonus earned 🎁",
    body: `<p>You earned <strong>${fmtMoney(c.data.amount)}</strong> because <strong>${escapeHtml(c.profile?.full_name || "your friend")}</strong> joined ${BRAND_NAME}.</p>`,
    cta: { label: "Invite More", url: `${APP_URL}/profile` },
  }),
  referral_milestone: (c) => ({
    subject: `🎉 ${c.data.count} successful referrals!`,
    title: `${c.data.count} referrals! 🎉`,
    body: `<p>You've referred <strong>${c.data.count}</strong> people. You're a top ambassador!</p>`,
    cta: { label: "Keep Inviting", url: `${APP_URL}/profile` },
  }),
  vip_expiring: (c) => ({
    subject: "Your VIP access is expiring soon",
    title: "VIP expiring ⏳",
    body: `<p>Your VIP access expires on <strong>${escapeHtml(c.data.expires_at || "soon")}</strong>. Renew now to keep your perks.</p>`,
    cta: { label: "Renew VIP", url: `${APP_URL}/wallet` },
  }),

  // ---- Account & Security ----
  account_created: (c) => ({
    subject: `Welcome to ${BRAND_NAME} 🎉`,
    title: `Welcome aboard, ${escapeHtml(c.data.name || "trader")}!`,
    body: `<p>Your ${BRAND_NAME} account is ready. Start exploring AI-powered chart analysis, demo trading, live signals, and a community of traders.</p>
      <ul style="font-size:14px;color:#334155;padding-left:18px;">
        <li>📈 Get AI analysis on any chart</li>
        <li>💼 Practice with a free demo wallet</li>
        <li>👥 Join trading rooms & copy top traders</li>
      </ul>
      <p style="color:#64748b;font-size:13px;">⚠️ Trading involves risk. Never invest more than you can afford to lose.</p>`,
    cta: { label: "Open App", url: APP_URL },
  }),
  login_alert: (c) => ({
    subject: "New sign-in to your account",
    title: "New device signed in 🔐",
    body: `<p>We noticed a new sign-in to your ${BRAND_NAME} account.</p>
      <table style="width:100%;margin:12px 0;font-size:14px;color:#334155;">
        <tr><td style="padding:4px 0;color:#64748b;">Device</td><td><strong>${escapeHtml(c.data.device || "Unknown")}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Location</td><td><strong>${escapeHtml(c.data.location || "Unknown")}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Time</td><td><strong>${escapeHtml(c.data.time || new Date().toLocaleString())}</strong></td></tr>
      </table>
      <p style="color:#dc2626;font-size:13px;">If this wasn't you, change your password immediately.</p>`,
    cta: { label: "Secure Account", url: `${APP_URL}/profile` },
  }),
  password_changed: () => ({
    subject: "Your password was changed",
    title: "Password updated ✅",
    body: `<p>Your account password was just changed. If you did not make this change, please contact support immediately.</p>`,
    cta: { label: "Contact Support", url: `${APP_URL}/help` },
  }),
  pin_changed: () => ({
    subject: "Your transaction PIN was changed",
    title: "Transaction PIN updated 🔑",
    body: `<p>Your withdrawal PIN was just updated. If this wasn't you, secure your account immediately.</p>`,
    cta: { label: "Review Security", url: `${APP_URL}/profile` },
  }),

  // ---- KYC ----
  kyc_submitted: () => ({
    subject: "KYC submitted — under review",
    title: "Verification received 📋",
    body: `<p>Thanks for submitting your KYC documents. Our team is reviewing them and you'll hear back within 24–48 hours.</p>`,
    cta: { label: "View Status", url: `${APP_URL}/kyc` },
  }),
  kyc_approved: (c) => ({
    subject: "✅ KYC verified — you're approved!",
    title: "You're verified! ✅",
    body: `<p>Congratulations ${escapeHtml(c.data.name || "")}! Your identity has been verified. You now have a verified badge and full access to withdrawals and premium features.</p>`,
    cta: { label: "View Profile", url: `${APP_URL}/profile` },
  }),
  kyc_rejected: (c) => ({
    subject: "KYC verification needs attention",
    title: "Verification couldn't be approved",
    body: `<p>We couldn't verify your identity with the documents provided.</p>${c.data.reason ? `<p style="color:#dc2626;">Reason: ${escapeHtml(c.data.reason)}</p>` : ""}<p>Please re-submit with clearer documents.</p>`,
    cta: { label: "Re-submit KYC", url: `${APP_URL}/kyc` },
  }),

  // ---- Trading ----
  trade_won: (c) => ({
    subject: `🎯 Trade won — +${fmtMoney(c.data.payout)}`,
    title: "Winning trade! 🎯",
    body: `<p>Your <strong>${escapeHtml(c.data.direction || "")}</strong> position on <strong>${escapeHtml(c.data.symbol || "")}</strong> closed in profit.</p>
      <table style="width:100%;margin:12px 0;font-size:14px;">
        <tr><td style="color:#64748b;padding:4px 0;">Stake</td><td><strong>${fmtMoney(c.data.stake)}</strong></td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">Payout</td><td style="color:#16a34a;"><strong>+${fmtMoney(c.data.payout)}</strong></td></tr>
      </table>`,
    cta: { label: "Trade Again", url: `${APP_URL}/trading` },
  }),
  trade_lost: (c) => ({
    subject: `Trade closed — ${escapeHtml(c.data.symbol || "")}`,
    title: "Trade didn't go your way",
    body: `<p>Your <strong>${escapeHtml(c.data.direction || "")}</strong> position on <strong>${escapeHtml(c.data.symbol || "")}</strong> closed at a loss of <strong>${fmtMoney(c.data.stake)}</strong>.</p>
      <p style="color:#64748b;font-size:13px;">Review your strategy and try again. Remember: never risk more than you can afford to lose.</p>`,
    cta: { label: "View Trade History", url: `${APP_URL}/trading` },
  }),
  losing_streak_alert: (c) => ({
    subject: "Take a breath — losing streak detected",
    title: "Heads up — losing streak 💭",
    body: `<p>You've had <strong>${c.data.count || 3}</strong> losing trades in a row. Consider taking a short break, reviewing your strategy, or switching to demo mode.</p>
      <p style="color:#64748b;font-size:13px;">Discipline beats emotion. We're here to help you trade smart.</p>`,
    cta: { label: "Open Demo Mode", url: `${APP_URL}/trading` },
  }),

  // ---- Signals & Copy Trading ----
  signal_published: (c) => ({
    subject: `📡 New signal: ${escapeHtml(c.data.symbol || "")} ${escapeHtml(c.data.direction || "")}`,
    title: "New trading signal 📡",
    body: `<p>A fresh signal just dropped:</p>
      <table style="width:100%;margin:12px 0;font-size:14px;">
        <tr><td style="color:#64748b;padding:4px 0;">Pair</td><td><strong>${escapeHtml(c.data.symbol || "")}</strong></td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">Direction</td><td><strong>${escapeHtml(c.data.direction || "")}</strong></td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">Entry</td><td><strong>${escapeHtml(c.data.entry || "")}</strong></td></tr>
        <tr><td style="color:#64748b;padding:4px 0;">SL / TP</td><td><strong>${escapeHtml(c.data.sl || "—")} / ${escapeHtml(c.data.tp || "—")}</strong></td></tr>
      </table>`,
    cta: { label: "View Signal", url: `${APP_URL}/daily-streak` },
  }),
  signal_redeemed: (c) => ({
    subject: "Signal code redeemed",
    title: "Signal unlocked 🔓",
    body: `<p>Your signal code <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${escapeHtml(c.data.code || "")}</code> has been redeemed successfully.</p>`,
    cta: { label: "View Signal", url: `${APP_URL}/daily-streak` },
  }),
  copy_started: (c) => ({
    subject: `You're now copying ${c.profile?.full_name || "a trader"}`,
    title: "Copy trading active 🤝",
    body: `${profileCard(c.profile)}<p>You're now automatically copying their trades with a fixed stake of <strong>${fmtMoney(c.data.amount)}</strong> per trade.</p>`,
    cta: { label: "Manage Copies", url: `${APP_URL}/trading` },
  }),
  copy_stopped: (c) => ({
    subject: `Stopped copying ${c.profile?.full_name || "trader"}`,
    title: "Copy trading paused",
    body: `${profileCard(c.profile)}<p>You've stopped copying this trader's signals.</p>`,
    cta: { label: "Find New Traders", url: `${APP_URL}/trading` },
  }),
  copy_trade_executed: (c) => ({
    subject: `Copied trade: ${escapeHtml(c.data.symbol || "")}`,
    title: "Trade copied automatically 🔁",
    body: `${profileCard(c.profile)}<p>A new <strong>${escapeHtml(c.data.direction || "")}</strong> trade on <strong>${escapeHtml(c.data.symbol || "")}</strong> was placed for <strong>${fmtMoney(c.data.stake)}</strong>.</p>`,
    cta: { label: "View Position", url: `${APP_URL}/trading` },
  }),

  // ---- Subscription / Paywall ----
  subscription_activated: (c) => ({
    subject: "🎉 Subscription activated",
    title: "Welcome to Premium 🎉",
    body: `<p>Your <strong>${escapeHtml(c.data.plan || "Premium")}</strong> subscription is now active until <strong>${escapeHtml(c.data.expires_at || "soon")}</strong>.</p>
      <p>Enjoy unlimited AI analysis, premium signals, advanced tools, and ad-free access.</p>`,
    cta: { label: "Explore Premium", url: APP_URL },
  }),
  subscription_expired: (c) => ({
    subject: "Your subscription has expired",
    title: "Subscription ended ⌛",
    body: `<p>Your <strong>${escapeHtml(c.data.plan || "Premium")}</strong> subscription has expired. Renew to keep premium features.</p>`,
    cta: { label: "Renew Now", url: `${APP_URL}/wallet` },
  }),

  // ---- P2P Money Requests ----
  money_request_received: (c) => ({
    subject: `${c.profile?.full_name || "Someone"} requested ${fmtMoney(c.data.amount)}`,
    title: "New money request 💰",
    body: `${profileCard(c.profile)}<p>They are requesting <strong>${fmtMoney(c.data.amount)}</strong> from you${c.data.note ? ` — <em>"${escapeHtml(c.data.note)}"</em>` : ""}.</p>`,
    cta: { label: "Review Request", url: `${APP_URL}/send-funds` },
  }),
  money_request_accepted: (c) => ({
    subject: `${c.profile?.full_name || "User"} accepted your request`,
    title: "Request accepted ✅",
    body: `${profileCard(c.profile)}<p>You received <strong>${fmtMoney(c.data.amount)}</strong>.</p>`,
    cta: { label: "View Wallet", url: `${APP_URL}/wallet` },
  }),
  money_request_declined: (c) => ({
    subject: `${c.profile?.full_name || "User"} declined your request`,
    title: "Request declined",
    body: `${profileCard(c.profile)}<p>Your money request of <strong>${fmtMoney(c.data.amount)}</strong> was declined.</p>`,
    cta: { label: "Open Wallet", url: `${APP_URL}/wallet` },
  }),

  // ---- Chat Rooms ----
  room_join_request: (c) => ({
    subject: `Join request for ${escapeHtml(c.data.room_name || "your room")}`,
    title: "Someone wants to join 👋",
    body: `${profileCard(c.profile)}<p>They are requesting to join <strong>${escapeHtml(c.data.room_name || "your room")}</strong>.</p>`,
    cta: { label: "Review Request", url: `${APP_URL}/chat-rooms` },
  }),
  room_join_approved: (c) => ({
    subject: `Welcome to ${escapeHtml(c.data.room_name || "the room")}!`,
    title: "You're in 🎉",
    body: `<p>Your request to join <strong>${escapeHtml(c.data.room_name || "the room")}</strong> was approved. Jump in and start chatting!</p>`,
    cta: { label: "Open Room", url: `${APP_URL}/chat/${c.data.room_id || ""}` },
  }),
  room_join_declined: (c) => ({
    subject: `Join request declined`,
    title: "Request declined",
    body: `<p>Your request to join <strong>${escapeHtml(c.data.room_name || "the room")}</strong> was declined.</p>`,
    cta: { label: "Browse Rooms", url: `${APP_URL}/chat-rooms` },
  }),

  // ---- AI Analysis ----
  analysis_ready: (c) => ({
    subject: `AI analysis ready: ${escapeHtml(c.data.symbol || "your chart")}`,
    title: "Your AI analysis is ready 🤖",
    body: `<p>Your AI analysis on <strong>${escapeHtml(c.data.symbol || "your chart")}</strong> is complete. ${c.data.summary ? `<br><br><em>"${escapeHtml(c.data.summary.slice(0, 200))}…"</em>` : ""}</p>
      <p style="color:#64748b;font-size:13px;">⚠️ AI analysis is not financial advice. Always do your own research.</p>`,
    cta: { label: "View Analysis", url: `${APP_URL}/analysis-history` },
  }),

  // ---- Admin / Support ----
  admin_broadcast: (c) => ({
    subject: escapeHtml(c.data.subject || `Update from ${BRAND_NAME}`),
    title: escapeHtml(c.data.title || `News from ${BRAND_NAME} 📣`),
    body: `<div>${escapeHtml(c.data.message || "")}</div>`,
    cta: c.data.cta_url ? { label: c.data.cta_label || "Open App", url: c.data.cta_url } : { label: "Open App", url: APP_URL },
  }),
  report_received: () => ({
    subject: "Your report has been received",
    title: "Report received 🛡️",
    body: `<p>Thanks for keeping our community safe. Our team will review your report within 24 hours.</p>`,
    cta: { label: "Open App", url: APP_URL },
  }),
  fraud_alert: (c) => ({
    subject: "⚠️ Suspicious activity detected",
    title: "Security alert 🚨",
    body: `<p>We detected suspicious activity on your account: <strong>${escapeHtml(c.data.reason || "Unusual activity")}</strong>.</p><p>Please review your recent transactions and secure your account.</p>`,
    cta: { label: "Review Account", url: `${APP_URL}/profile` },
  }),

  // ---- Test ----
  test_email: (c) => ({
    subject: `Test email from ${BRAND_NAME}`,
    title: "Test email ✅",
    body: `<p>This is a test email sent from the ${BRAND_NAME} admin panel at <strong>${escapeHtml(new Date().toLocaleString())}</strong>.</p>
      <p>If you received this, your EmailJS integration is working correctly! 🎉</p>
      ${c.data.note ? `<blockquote style="margin:12px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid ${BRAND_PRIMARY};border-radius:6px;">${escapeHtml(c.data.note)}</blockquote>` : ""}`,
    cta: { label: "Open Dashboard", url: APP_URL },
  }),
};

async function buildEmail(type: string, recipientEmail: string, data: any, supabase: any, userId?: string, shortId?: string) {
  let profile: any = null;
  let post: any = null;
  if (userId) {
    const { data: p } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, display_id")
      .eq("user_id", userId)
      .maybeSingle();
    profile = p;
  }
  if (shortId) {
    const { data: pst } = await supabase
      .from("posts")
      .select("id, content, image_url, video_url")
      .eq("id", shortId)
      .maybeSingle();
    post = pst;
  }
  const builder = REGISTRY[type];
  if (!builder) throw new Error(`Unknown email type: ${type}`);
  const built = builder({ recipientEmail, data: data || {}, profile, post });
  const html = emailShell({
    preheader: built.subject,
    title: built.title,
    bodyHtml: built.body,
    ctaLabel: built.cta?.label,
    ctaUrl: built.cta?.url,
    recipientEmail,
  });
  return { subject: built.subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, userEmail, data, userId, shortId, previewOnly } = await req.json();

    if (!type || !userEmail) {
      return new Response(JSON.stringify({ error: "type and userEmail required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { subject, html } = await buildEmail(type, userEmail, data, supabase, userId, shortId);

    if (previewOnly) {
      return new Response(JSON.stringify({ success: true, html, subject }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceId = Deno.env.get("EMAILJS_SERVICE_ID")!;
    const templateId = Deno.env.get("EMAILJS_TEMPLATE_ID")!;
    const publicKey = Deno.env.get("EMAILJS_PUBLIC_KEY")!;
    const privateKey = Deno.env.get("EMAILJS_PRIVATE_KEY")!;

    const ejRes = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "origin": "http://localhost" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          subject,
          to_email: userEmail,
          html_body: html,
        },
      }),
    });

    const ejText = await ejRes.text();
    const ok = ejRes.ok;

    const { data: logRow } = await supabase.from("email_send_log").insert({
      user_id: userId || null,
      recipient_email: userEmail,
      email_type: type,
      subject,
      status: ok ? "sent" : "failed",
      provider_message_id: ok ? ejText.slice(0, 200) : null,
      error_message: ok ? null : ejText.slice(0, 500),
      payload: data || null,
    }).select("id").single();

    if (!ok) {
      // Email provider failed (e.g. monthly quota exceeded). Email is
      // fire-and-forget — return 200 with a structured error so the client
      // can degrade gracefully without surfacing a runtime crash.
      return new Response(JSON.stringify({ success: false, error: ejText, fallback: true, id: logRow?.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: logRow?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
