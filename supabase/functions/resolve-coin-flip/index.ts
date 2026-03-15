import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushNotifications } from "../_shared/push-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { game_id } = await req.json();
    if (!game_id) throw new Error("game_id required");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch game with FOR UPDATE lock
    const { data: game, error: gErr } = await adminClient
      .from("coin_flip_games")
      .select("*")
      .eq("id", game_id)
      .single();

    if (gErr || !game) throw new Error("Game not found");
    if (game.status !== "waiting") throw new Error("Game already resolved");
    if (game.creator_id === user.id) throw new Error("Cannot accept your own game");

    // Deduct opponent's wallet
    const { data: deducted } = await adminClient.rpc("deduct_user_wallet", {
      p_user_id: user.id,
      p_amount: game.stake_amount,
    });

    // Manual deduct since RPC checks auth.uid
    const { data: oppWallet } = await adminClient
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!oppWallet || oppWallet.balance < game.stake_amount) {
      throw new Error("Insufficient balance");
    }

    await adminClient
      .from("wallets")
      .update({ balance: oppWallet.balance - game.stake_amount, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    // Server-side provably fair random
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const randomValue = randomBytes[0];
    const result = randomValue % 2 === 0 ? "heads" : "tails";
    const winnerId = result === game.creator_choice ? game.creator_id : user.id;
    const loserId = winnerId === game.creator_id ? user.id : game.creator_id;
    const totalPot = game.stake_amount * 2;

    // Update game to resolved atomically
    const { error: updateErr } = await adminClient
      .from("coin_flip_games")
      .update({
        opponent_id: user.id,
        result,
        winner_id: winnerId,
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", game_id)
      .eq("status", "waiting"); // Ensure no double-resolve

    if (updateErr) throw new Error("Failed to resolve game");

    // Credit winner
    await adminClient.rpc("credit_user_wallet_service", {
      p_user_id: winnerId,
      p_amount: totalPot,
    });

    // Send push notifications
    try {
      await sendPushNotifications({
        userIds: [winnerId],
        title: "🪙 You Won a Coin Flip!",
        message: `You won ₦${totalPot.toLocaleString()} in a coin flip!`,
        url: "/chat-rooms",
        type: "success",
      });
      await sendPushNotifications({
        userIds: [loserId],
        title: "🪙 Coin Flip Result",
        message: `You lost ₦${game.stake_amount.toLocaleString()} in a coin flip. Better luck next time!`,
        url: "/chat-rooms",
        type: "info",
      });
    } catch (e) {
      console.error("Push notification error:", e);
    }

    return new Response(JSON.stringify({
      success: true,
      result,
      winner_id: winnerId,
      total_pot: totalPot,
      is_winner: winnerId === user.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
