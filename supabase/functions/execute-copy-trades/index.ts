import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CopyTradeRequest {
  leader_id: string;
  symbol: string;
  trade_type: "buy" | "sell";
  entry_price: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { leader_id, symbol, trade_type, entry_price }: CopyTradeRequest = await req.json();

    if (!leader_id || !symbol || !trade_type || !entry_price) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active followers for this leader
    const { data: followers, error: followError } = await supabaseAdmin
      .from("copy_follows")
      .select("*")
      .eq("leader_id", leader_id)
      .eq("is_active", true);

    if (followError) {
      console.error("Error fetching followers:", followError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch followers" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!followers || followers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active followers", copied: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const follow of followers) {
      const followerId = follow.follower_id;
      const fixedAmount = follow.fixed_amount;

      // Check follower's real wallet balance
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .select("balance")
        .eq("user_id", followerId)
        .maybeSingle();

      if (walletError || !wallet) {
        results.push({ follower_id: followerId, status: "error", reason: "Wallet not found" });
        continue;
      }

      if (wallet.balance < fixedAmount) {
        results.push({ follower_id: followerId, status: "skipped", reason: "Insufficient balance" });
        continue;
      }

      // Deduct from wallet
      const { data: deductSuccess, error: deductError } = await supabaseAdmin.rpc(
        "deduct_user_wallet",
        { p_user_id: followerId, p_amount: fixedAmount }
      );

      if (deductError || !deductSuccess) {
        results.push({ follower_id: followerId, status: "error", reason: "Failed to deduct balance" });
        continue;
      }

      // Create copy position
      const { data: position, error: posError } = await supabaseAdmin
        .from("demo_positions")
        .insert({
          user_id: followerId,
          symbol,
          trade_type,
          entry_price,
          current_price: entry_price,
          amount: fixedAmount,
          leverage: 1,
          status: "open",
          account_type: "real",
        })
        .select()
        .single();

      if (posError) {
        // Refund on failure
        await supabaseAdmin.rpc("credit_user_wallet", {
          p_user_id: followerId,
          p_amount: fixedAmount,
        });
        results.push({ follower_id: followerId, status: "error", reason: "Failed to create position" });
        continue;
      }

      // Create notification for the follower
      await supabaseAdmin.from("notifications").insert({
        user_id: followerId,
        title: "Copy Trade Opened",
        message: `Copied ${trade_type.toUpperCase()} on ${symbol} @ ${entry_price.toFixed(2)} for ₦${fixedAmount}`,
        type: "copy_trade",
        action_url: "/trading",
      });

      results.push({
        follower_id: followerId,
        status: "success",
        position_id: position.id,
        amount: fixedAmount,
      });
    }

    const successCount = results.filter((r) => r.status === "success").length;

    return new Response(
      JSON.stringify({
        message: `Copied trade for ${successCount}/${followers.length} followers`,
        copied: successCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in execute-copy-trades:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});