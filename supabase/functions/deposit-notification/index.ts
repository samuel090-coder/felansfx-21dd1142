import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ApplicationServer,
  importVapidKeys,
  Urgency,
} from "jsr:@negrel/webpush";
import { getVapidKeysAsJwk } from "../_shared/vapid.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DepositNotificationRequest {
  action: "approve" | "reject";
  depositId: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  reason?: string;
}

// Format amount in NGN
function formatNGN(amount: number): string {
  return `₦${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUSD(amountNGN: number): string {
  const usd = amountNGN * 0.00063;
  return `$${usd.toFixed(2)}`;
}

// Initialize application server once
let appServer: ApplicationServer | null = null;

async function getAppServer(): Promise<ApplicationServer | null> {
  if (appServer) return appServer;

  // Get VAPID keys from env and convert to JWK
  const jwkKeys = getVapidKeysAsJwk();
  if (!jwkKeys) {
    console.log("VAPID keys not configured, push notifications disabled");
    return null;
  }

  try {
    // Import VAPID keys in JWK format
    const vapidKeys = await importVapidKeys(jwkKeys);

    // Create application server
    appServer = await ApplicationServer.new({
      contactInformation: "mailto:admin@felansfx.com",
      vapidKeys,
    });

    console.log("VAPID server initialized successfully for deposit notifications");
    return appServer;
  } catch (error) {
    console.error("Failed to initialize VAPID:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use anon key client with user's token for auth verification
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user identity
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("Auth verification failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerUserId = claimsData.claims.sub as string;

    // ========== ADMIN ROLE CHECK ==========
    // Use service role client for admin check
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _role: "admin",
      _user_id: callerUserId,
    });

    if (roleError || !isAdmin) {
      console.error("Admin role check failed:", roleError, "isAdmin:", isAdmin);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin verified:", callerUserId);

    // ========== INPUT VALIDATION ==========
    const body: DepositNotificationRequest = await req.json();
    const { action, depositId, userId, userEmail, userName, amount, reason } = body;

    if (!action || (action !== "approve" && action !== "reject")) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'approve' or 'reject'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!depositId || typeof depositId !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid depositId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId || typeof userId !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify deposit exists and belongs to specified user
    const { data: deposit, error: depositError } = await supabase
      .from("deposits")
      .select("id, user_id, status")
      .eq("id", depositId)
      .single();

    if (depositError || !deposit) {
      console.error("Deposit not found:", depositError);
      return new Response(
        JSON.stringify({ error: "Deposit not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (deposit.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "User ID mismatch with deposit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${action} notification for deposit ${depositId}`);

    // Fetch the appropriate template
    const templateKey = action === "approve" ? "deposit_approved" : "deposit_rejected";
    const { data: template, error: templateError } = await supabase
      .from("notification_templates")
      .select("subject, body, is_active")
      .eq("key", templateKey)
      .single();

    if (templateError || !template) {
      console.error("Template not found:", templateError);
      throw new Error("Notification template not found");
    }

    if (!template.is_active) {
      console.log("Template is disabled, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "Template disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format amount in NGN (primary) with USD equivalent
    const amountFormatted = `${formatNGN(amount)} (approx. ${formatUSD(amount)} USD)`;

    // Replace placeholders in template - use NGN format
    const subject = template.subject;
    const emailBody = template.body
      .replace(/\$AMOUNT/g, amountFormatted)
      .replace(/\$REASON/g, reason || "No reason provided")
      .replace(/\$USER/g, userName || "User");

    // Create in-app notification with NGN currency
    const notificationType = action === "approve" ? "success" : "error";
    const notificationTitle = action === "approve" 
      ? "Deposit Approved" 
      : "Deposit Rejected";
    const notificationMessage = action === "approve"
      ? `Your deposit of ${formatNGN(amount)} has been approved and credited to your wallet.`
      : `Your deposit of ${formatNGN(amount)} has been rejected. ${reason || ""}`;

    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: userId,
      title: notificationTitle,
      message: notificationMessage,
      type: notificationType,
      action_url: "/deposit",
    });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    }

    // ========== SEND PUSH NOTIFICATION ==========
    let pushResult = { sent: 0, failed: 0, cleaned: 0 };

    const server = await getAppServer();
    
    if (server) {
      // Get user's push subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", userId);

      if (subError) {
        console.error("Error fetching push subscriptions:", subError);
      } else if (subscriptions && subscriptions.length > 0) {
        console.log(`Found ${subscriptions.length} push subscription(s) for user ${userId}`);

        const pushPayload = JSON.stringify({
          title: notificationTitle,
          body: notificationMessage,
          icon: "/favicon-512.png",
          url: "/deposit",
        });

        // Deduplicate by endpoint
        const uniqueEndpoints = new Map<string, typeof subscriptions[0]>();
        for (const sub of subscriptions) {
          if (!uniqueEndpoints.has(sub.endpoint)) {
            uniqueEndpoints.set(sub.endpoint, sub);
          }
        }

        const expiredIds: string[] = [];

        for (const [endpoint, sub] of uniqueEndpoints) {
          try {
            // Create subscriber using the library
            const subscriber = server.subscribe({
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            });

            // Send push
            await subscriber.pushTextMessage(pushPayload, {
              urgency: Urgency.High,
              ttl: 86400,
            });

            pushResult.sent++;
            console.log(`Push sent to endpoint: ${endpoint.substring(0, 50)}...`);
          } catch (error: unknown) {
            pushResult.failed++;
            const err = error as Error & { isGone?: () => boolean };
            console.error(`Push failed for endpoint: ${endpoint.substring(0, 50)}... Error: ${err.message}`);
            
            // Check if subscription is gone
            if (typeof err.isGone === "function" && err.isGone()) {
              expiredIds.push(sub.id);
            }
          }
        }

        // Delete expired subscriptions
        if (expiredIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("push_subscriptions")
            .delete()
            .in("id", expiredIds);
          
          if (!deleteError) {
            pushResult.cleaned = expiredIds.length;
            console.log(`Cleaned up ${expiredIds.length} expired subscription(s)`);
          }
        }
      } else {
        console.log(`No push subscriptions found for user ${userId}`);
      }
    } else {
      console.log("Push notifications not configured");
    }

    // Build mailto: URL for native email app
    const mailtoUrl = `mailto:${encodeURIComponent(userEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

    console.log(`Notification created successfully. Push: ${pushResult.sent} sent, ${pushResult.failed} failed, ${pushResult.cleaned} cleaned`);

    return new Response(
      JSON.stringify({
        success: true,
        mailtoUrl,
        subject,
        body: emailBody,
        pushResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in deposit-notification function:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
