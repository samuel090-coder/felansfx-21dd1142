import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushNotifications } from "../_shared/push-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type NotificationType = "morning" | "midday" | "evening";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const body = await req.json().catch(() => ({}));
    const notificationType: NotificationType = body.type || "morning";

    // Determine which users want this notification type
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get users who want this type of notification
    const prefColumn = notificationType === "morning" ? "morning_brief" :
                       notificationType === "midday" ? "midday_opportunities" : "evening_recap";

    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, preferred_pairs")
      .eq(prefColumn, true);

    // Get all subscribed users (those without preferences get all notifications by default)
    const { data: allSubs } = await supabase
      .from("push_subscriptions")
      .select("user_id");

    const allSubUserIds = [...new Set(allSubs?.map(s => s.user_id) || [])];
    const prefsUserIds = new Set(prefs?.map(p => p.user_id) || []);

    // Users to notify: those with preference enabled OR those without any preferences set
    const usersWithPrefs = new Set(prefs?.map(p => p.user_id) || []);
    const { data: allPrefs } = await supabase
      .from("notification_preferences")
      .select("user_id");
    const allPrefsUserIds = new Set(allPrefs?.map(p => p.user_id) || []);

    const targetUserIds = allSubUserIds.filter(uid =>
      !allPrefsUserIds.has(uid) || prefsUserIds.has(uid)
    );

    if (targetUserIds.length === 0) {
      console.log("No users to notify for", notificationType);
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect preferred pairs
    const allPairs = new Set<string>();
    prefs?.forEach(p => p.preferred_pairs?.forEach((pair: string) => allPairs.add(pair)));
    if (allPairs.size === 0) {
      ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "NAS100"].forEach(p => allPairs.add(p));
    }
    const pairsStr = [...allPairs].join(", ");

    // Generate AI content
    let title = "";
    let messageBody = "";

    const prompts: Record<NotificationType, string> = {
      morning: `Generate a professional Forex morning brief push notification for ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.
Focus pairs: ${pairsStr}.
Include: daily market outlook, key support/resistance levels, economic calendar highlights.
Format: JSON with "title" (max 50 chars, catchy with 1-2 emojis) and "body" (max 200 chars, specific levels/info, professional trader tone, end with call-to-action).`,

      midday: `Generate a professional Forex midday opportunity push notification.
Focus pairs: ${pairsStr}.
Include: live setups, fresh signal ideas, news impact analysis, best entry points right now.
Format: JSON with "title" (max 50 chars, catchy with 1-2 emojis) and "body" (max 200 chars, specific actionable info, professional trader tone).`,

      evening: `Generate a professional Forex evening recap push notification.
Focus pairs: ${pairsStr}.
Include: daily results summary, key moves that happened, lessons learned, tomorrow's watchlist.
Format: JSON with "title" (max 50 chars, catchy with 1-2 emojis) and "body" (max 200 chars, insightful recap, professional trader tone).`,
    };

    if (lovableApiKey) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a professional Forex market analyst writing push notifications. Always respond with valid JSON only, no markdown. Be specific with price levels and pair names."
              },
              { role: "user", content: prompts[notificationType] }
            ],
            tools: [{
              type: "function",
              function: {
                name: "create_notification",
                description: "Create a push notification with title and body",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Notification title, max 50 chars" },
                    body: { type: "string", description: "Notification body, max 200 chars" },
                  },
                  required: ["title", "body"],
                  additionalProperties: false,
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "create_notification" } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const args = JSON.parse(toolCall.function.arguments);
            title = args.title;
            messageBody = args.body;
          }
        } else {
          const errText = await aiResponse.text();
          console.error("AI error:", aiResponse.status, errText);
        }
      } catch (aiErr) {
        console.error("AI generation failed:", aiErr);
      }
    }

    // Fallback content if AI fails
    if (!title || !messageBody) {
      const fallbacks: Record<NotificationType, { title: string; body: string }> = {
        morning: {
          title: "🌅 Morning Market Brief",
          body: `Good morning! Key levels to watch today on ${pairsStr}. Check your signals for fresh setups. Trade smart! 📊`,
        },
        midday: {
          title: "🔥 Midday Opportunities Alert",
          body: `Live setups available on ${pairsStr}. The market is moving — don't miss today's best entries! 📈`,
        },
        evening: {
          title: "🌙 Evening Market Recap",
          body: `Today's trading session recap. Review the key moves on ${pairsStr} and prepare for tomorrow. 📋`,
        },
      };
      title = fallbacks[notificationType].title;
      messageBody = fallbacks[notificationType].body;
    }

    console.log(`Sending ${notificationType} notification to ${targetUserIds.length} users: "${title}"`);

    // Send push notifications
    const result = await sendPushNotifications({
      userIds: targetUserIds,
      title,
      message: messageBody,
      url: "/daily-streak",
      type: "info",
    });

    return new Response(
      JSON.stringify({
        success: true,
        type: notificationType,
        title,
        body: messageBody,
        targetUsers: targetUserIds.length,
        ...result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Daily notification error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
