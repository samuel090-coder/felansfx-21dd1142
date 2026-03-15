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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { game_id } = await req.json();
    if (!game_id) throw new Error("game_id required");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch game
    const { data: game, error: gErr } = await adminClient
      .from("jackpot_games")
      .select("*")
      .eq("id", game_id)
      .single();

    if (gErr || !game) throw new Error("Game not found");
    if (game.status !== "open") throw new Error("Game already resolved or spinning");
    if (game.created_by !== user.id) throw new Error("Only creator can spin");

    // Fetch entries
    const { data: entries } = await adminClient
      .from("jackpot_entries")
      .select("*")
      .eq("game_id", game_id);

    if (!entries || entries.length < 2) throw new Error("Need at least 2 players");

    // Server-side weighted random
    const totalWeight = entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const randomBytes = new Uint8Array(4);
    crypto.getRandomValues(randomBytes);
    const randomValue = (randomBytes[0] * 16777216 + randomBytes[1] * 65536 + randomBytes[2] * 256 + randomBytes[3]) / 4294967296;

    let cumulative = 0;
    let winnerId = entries[0].user_id;
    for (const entry of entries) {
      cumulative += Number(entry.amount) / totalWeight;
      if (randomValue <= cumulative) {
        winnerId = entry.user_id;
        break;
      }
    }

    // Resolve game atomically
    const { error: updateErr } = await adminClient
      .from("jackpot_games")
      .update({
        status: "resolved",
        winner_id: winnerId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", game_id)
      .eq("status", "open"); // Prevent double-resolve

    if (updateErr) throw new Error("Failed to resolve game");

    // Credit winner
    await adminClient.rpc("credit_user_wallet_service", {
      p_user_id: winnerId,
      p_amount: totalWeight,
    });

    // Send push notifications
    try {
      const loserIds = entries.filter((e: any) => e.user_id !== winnerId).map((e: any) => e.user_id);
      
      await sendPushNotifications({
        userIds: [winnerId],
        title: "🎰 Jackpot Winner!",
        message: `You won ₦${totalWeight.toLocaleString()} in the Jackpot Wheel!`,
        url: "/chat-rooms",
        type: "success",
      });

      if (loserIds.length > 0) {
        await sendPushNotifications({
          userIds: loserIds,
          title: "🎰 Jackpot Result",
          message: `The Jackpot Wheel of ₦${totalWeight.toLocaleString()} has been won. Better luck next time!`,
          url: "/chat-rooms",
          type: "info",
        });
      }
    } catch (e) {
      console.error("Push notification error:", e);
    }

    return new Response(JSON.stringify({
      success: true,
      winner_id: winnerId,
      total_pot: totalWeight,
      is_winner: winnerId === user.id,
      entries_count: entries.length,
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
