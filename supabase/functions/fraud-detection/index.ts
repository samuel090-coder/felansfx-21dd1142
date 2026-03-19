import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { type, user_id, details } = await req.json();

    // Run fraud checks based on type
    const alerts: string[] = [];

    if (type === "trade_check") {
      // Check rapid-fire trading (more than 20 trades in 5 min)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("demo_positions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .gte("opened_at", fiveMinAgo);

      if ((count || 0) > 20) {
        alerts.push(`RAPID_TRADING: User ${user_id} opened ${count} positions in 5 minutes`);
      }

      // Check for suspiciously high win rate on real account (>95% over 20+ trades)
      const { data: stats } = await admin
        .from("demo_trade_history")
        .select("pnl")
        .eq("user_id", user_id)
        .eq("account_type", "real")
        .order("closed_at", { ascending: false })
        .limit(20);

      if (stats && stats.length >= 20) {
        const wins = stats.filter(t => t.pnl > 0).length;
        const winRate = (wins / stats.length) * 100;
        if (winRate > 95) {
          alerts.push(`SUSPICIOUS_WINRATE: User ${user_id} has ${winRate}% win rate over last 20 trades`);
        }
      }
    }

    if (type === "game_check") {
      // Check if user is creating and playing games with themselves (multi-accounting)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: games } = await admin
        .from("coin_flip_games")
        .select("creator_id, opponent_id, winner_id")
        .or(`creator_id.eq.${user_id},opponent_id.eq.${user_id}`)
        .gte("created_at", oneHourAgo)
        .eq("status", "resolved");

      if (games && games.length > 10) {
        alerts.push(`EXCESSIVE_GAMING: User ${user_id} played ${games.length} games in 1 hour`);
      }

      // Check always-winning pattern in games
      if (games && games.length >= 5) {
        const wins = games.filter(g => g.winner_id === user_id).length;
        if (wins === games.length) {
          alerts.push(`GAME_MANIPULATION: User ${user_id} won ALL ${games.length} games in last hour`);
        }
      }
    }

    if (type === "transfer_check") {
      // Check circular transfers (A->B->A pattern)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: sent } = await admin
        .from("fund_transfers")
        .select("receiver_id, amount")
        .eq("sender_id", user_id)
        .gte("created_at", oneDayAgo);

      const { data: received } = await admin
        .from("fund_transfers")
        .select("sender_id, amount")
        .eq("receiver_id", user_id)
        .gte("created_at", oneDayAgo);

      if (sent && received) {
        const sentTo = new Set(sent.map(t => t.receiver_id));
        const receivedFrom = new Set(received.map(t => t.sender_id));
        const circular = [...sentTo].filter(id => receivedFrom.has(id));
        if (circular.length > 0) {
          const totalSent = sent.filter(t => circular.includes(t.receiver_id)).reduce((s, t) => s + t.amount, 0);
          if (totalSent > 5000) {
            alerts.push(`CIRCULAR_TRANSFER: User ${user_id} has circular transfers with ${circular.join(", ")} totaling ₦${totalSent}`);
          }
        }
      }

      // Check rapid transfers (more than 10 in 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("fund_transfers")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", user_id)
        .gte("created_at", oneHourAgo);

      if ((count || 0) > 10) {
        alerts.push(`RAPID_TRANSFERS: User ${user_id} made ${count} transfers in 1 hour`);
      }
    }

    // Store alerts as admin notifications
    if (alerts.length > 0) {
      // Get admin user IDs
      const { data: admins } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      for (const adminUser of (admins || [])) {
        for (const alertMsg of alerts) {
          await admin.from("notifications").insert({
            user_id: adminUser.user_id,
            title: "🚨 Fraud Alert",
            message: alertMsg,
            type: "fraud_alert",
            action_url: "/admin",
          });
        }
      }

      // Try to send push notifications to admins
      try {
        for (const adminUser of (admins || [])) {
          await admin.functions.invoke("send-push", {
            body: {
              user_id: adminUser.user_id,
              title: "🚨 Fraud Alert",
              body: alerts[0],
            },
          });
        }
      } catch {}
    }

    return new Response(JSON.stringify({
      success: true,
      alerts_count: alerts.length,
      flagged: alerts.length > 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
