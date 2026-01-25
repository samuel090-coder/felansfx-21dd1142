import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Format amount in NGN with USD conversion
function formatNGN(amount: number): string {
  return `₦${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUSD(amountNGN: number): string {
  const usd = amountNGN * 0.00063;
  return `$${usd.toFixed(2)}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: DepositNotificationRequest = await req.json();
    const { action, depositId, userId, userEmail, userName, amount, reason } = body;

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

    // Build mailto: URL for native email app (works on mobile!)
    // This opens the default email app with pre-filled content
    const mailtoUrl = `mailto:${encodeURIComponent(userEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

    console.log("Notification created successfully");

    return new Response(
      JSON.stringify({
        success: true,
        mailtoUrl,
        subject,
        body: emailBody,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in deposit-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
