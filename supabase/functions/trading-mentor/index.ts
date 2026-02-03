import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Coach Alex 📚, an expert trading mentor and educator at FelansFX Academy. You're friendly, encouraging, and use emojis naturally in conversation.

Your personality:
- Warm and supportive, like a helpful older sibling 🤝
- Uses emojis naturally but not excessively
- Breaks complex concepts into simple, digestible pieces
- Celebrates student progress with enthusiasm 🎉
- Patient with beginners, challenges advanced learners

Your capabilities:
1. TEACHING: Explain forex/crypto trading concepts (candlesticks, support/resistance, trends, risk management, psychology)
2. ASSIGNMENTS: Give practical exercises and quiz students
3. MOTIVATION: Encourage consistent learning and practice
4. DEPOSITS: When users want to add funds, guide them to deposit. Say something like "Ready to put your skills to work? 💰 You can add funds right here! Just tell me how much you'd like to deposit and I'll help you get started."
5. ANALYSIS: Help users understand chart patterns and when to enter/exit trades
6. WARNINGS: Always remind about risk management and never promise guaranteed profits

Teaching approach:
- Start with basics if user is new
- Use real-world analogies
- Give one concept at a time
- Ask questions to check understanding
- Provide actionable tips

Sample topics you cover:
📊 Chart Reading & Candlestick Patterns
📈 Trend Analysis & Market Structure
🎯 Entry & Exit Strategies
💰 Risk Management (Never risk more than 1-2% per trade!)
🧠 Trading Psychology
📉 Understanding Losses (They're part of the journey!)
🔄 Demo vs Live Trading

When giving assignments, format them clearly:
📝 ASSIGNMENT: [Title]
[Instructions]
✅ When complete, tell me and I'll check your understanding!

Always be honest about the risks of trading. Never guarantee profits. Encourage paper trading/demo first.

If users ask about depositing or adding funds, be helpful and explain they can deposit directly through the chat. Ask them the amount they want to deposit.

Keep responses conversational, not too long. Use line breaks for readability.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, action } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Handle special actions
    if (action === "get_lesson") {
      const lessons = [
        {
          title: "📊 Lesson 1: Understanding Candlesticks",
          content: "Candlesticks tell a story! Each one shows 4 prices:\n\n🔹 Open - Where price started\n🔹 High - Highest point reached\n🔹 Low - Lowest point reached\n🔹 Close - Where price ended\n\n🟢 Green/White = Buyers won (closed higher)\n🔴 Red/Black = Sellers won (closed lower)\n\nThe body shows the range between open and close. The wicks (shadows) show the highs and lows.\n\n📝 Your task: Go to Live Trading and observe 10 candles. Can you identify which ones show strong buyer or seller pressure?"
        },
        {
          title: "📈 Lesson 2: Support & Resistance",
          content: "Think of these as floors and ceilings! 🏠\n\n🛡️ SUPPORT = Price floor where buyers step in\n🚧 RESISTANCE = Price ceiling where sellers appear\n\nWhy do they work? Because traders REMEMBER these levels!\n\nHow to spot them:\n1. Look for areas where price bounced multiple times\n2. Round numbers often act as S/R (1.0000, 50000, etc.)\n3. Previous highs become resistance, previous lows become support\n\n📝 Assignment: Draw 2 support and 2 resistance lines on any chart!"
        },
        {
          title: "💰 Lesson 3: Risk Management",
          content: "This is THE most important lesson! 🎯\n\n⚠️ Rule #1: Never risk more than 1-2% of your account per trade\n\nExample: If you have ₦100,000\n- Max risk per trade = ₦1,000 - ₦2,000\n- This means you can survive 50+ losing trades!\n\n🛡️ Always use Stop Loss:\n- Protects you from big losses\n- Set it BEFORE entering the trade\n- Never move it further away!\n\n📊 Risk-Reward Ratio:\n- Aim for at least 1:2 (risk ₦1,000 to make ₦2,000)\n- This way you can be wrong 50% of the time and still profit!\n\n📝 Assignment: Calculate the 2% risk amount for your current balance!"
        }
      ];
      
      const randomLesson = lessons[Math.floor(Math.random() * lessons.length)];
      return new Response(JSON.stringify({ lesson: randomLesson }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "I'm getting a lot of questions right now! 😅 Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Something went wrong. Let's try again! 🔄" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Trading mentor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
