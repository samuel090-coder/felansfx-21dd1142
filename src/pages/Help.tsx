import { Seo } from "@/components/Seo";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, BarChart3, Users, MessageSquare, Wallet, Shield, Bell, Brain, Gamepad2, Share2, Globe, Palette, Lock, Send, FileText, Crown, Zap, Target, BookOpen } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const sections = [
  {
    id: "trading",
    icon: TrendingUp,
    title: "Live Trading",
    color: "text-green-500",
    content: [
      "Felans FX gives you a full simulated trading experience with real-time price movements.",
      "",
      "**Demo Mode** – Practice trading with virtual funds (₦500,000 starting balance). No real money at risk.",
      "**Real Mode** – Trade using your deposited wallet balance. Profits and losses affect your real balance.",
      "**Symbols** – Trade popular Forex pairs (EUR/USD, GBP/USD, etc.), Crypto (BTC/USD, ETH/USD), and more.",
      "**Leverage** – Choose leverage from 1x up to 100x to amplify your trades.",
      "**Stop Loss & Take Profit** – Set automatic exit points to manage risk and lock in profits.",
      "**Trade Types** – Go Long (Buy) if you think price will rise, or Short (Sell) if you think it will fall.",
      "**Active Positions** – Monitor all your open trades in real-time with live P&L updates.",
      "**Trade History** – Review all your past trades, wins, and losses with detailed stats.",
    ],
  },
  {
    id: "signals",
    icon: Zap,
    title: "Signal Codes",
    color: "text-yellow-500",
    content: [
      "Signal codes let you instantly copy trade setups from other traders.",
      "",
      "**Generate Signals** – Create a signal code from any trade setup inside chat rooms.",
      "**Redeem Signals** – Paste a signal code on the Trading page to auto-fill the trade details.",
      "**How it works** – When you redeem a code, the symbol, direction, entry price, stop loss, and take profit are pre-filled. You just enter your amount and click Start.",
      "**Live Signals** – Signals shared in rooms are visible to all members and can be used instantly.",
    ],
  },
  {
    id: "analysis",
    icon: BarChart3,
    title: "AI Chart Analysis",
    color: "text-blue-500",
    content: [
      "Upload your trading chart screenshots and get AI-powered analysis.",
      "",
      "**Upload Charts** – Take a screenshot of any chart (15-minute or 4-hour timeframe) and upload it.",
      "**AI Analysis** – Our AI examines the chart for patterns, trends, support/resistance levels, and gives you a detailed trade idea.",
      "**Trade Ideas** – Get Buy, Sell, or Hold recommendations with entry price, stop loss, take profit, and risk-reward ratio.",
      "**Save & Compare** – Save analyses for later and compare multiple setups side by side.",
      "**Analysis History** – Access all your past analyses anytime.",
      "**Cost** – Each analysis costs credits from your wallet balance.",
    ],
  },
  {
    id: "ai-bot",
    icon: Brain,
    title: "AI Trading Assistant (Bot)",
    color: "text-purple-500",
    content: [
      "Purchase an AI trading bot that trades automatically on your behalf.",
      "",
      "**Subscription Plans** – Daily (₦5,000), 6 Months (₦50,000), or Lifetime (₦500,000). Admin can adjust prices.",
      "**How it works** – Once purchased, the AI bot analyzes market conditions and opens/closes trades for you automatically.",
      "**Risk Management** – The bot uses smart stop-loss and take-profit levels to manage your risk.",
      "**Monitor Performance** – Track your bot's trades and overall performance from the Trading page.",
      "**Cancel Anytime** – Daily and 6-month plans expire naturally. No hidden charges.",
    ],
  },
  {
    id: "wallet",
    icon: Wallet,
    title: "Wallet & Deposits",
    color: "text-emerald-500",
    content: [
      "Your wallet is the central hub for all money on the platform.",
      "",
      "**Balance** – View your current balance on the Home page or Profile.",
      "**Deposit** – Fund your wallet via bank transfer. Upload a payment screenshot as proof.",
      "**Auto-Approve** – If enabled by admin, deposits are approved instantly. Otherwise, admin reviews manually.",
      "**Withdraw** – Cash out your profits to your linked bank account. Requires your 4-digit transaction PIN.",
      "**Transaction PIN** – A secure 4-digit code required for withdrawals. Set it during registration or in Profile > Security Settings.",
      "**Currency** – Choose your preferred display currency (NGN, USD, EUR, GBP, etc.) from Profile settings.",
    ],
  },
  {
    id: "send-funds",
    icon: Send,
    title: "Send & Request Funds",
    color: "text-cyan-500",
    content: [
      "Transfer money to other users directly within the app.",
      "",
      "**Send Funds** – Enter a user's Display ID and send them money from your wallet instantly.",
      "**Request Money** – Request funds from another user. They'll get a notification and can approve or decline.",
      "**In-Room Requests** – You can also request money from users inside chat rooms.",
      "**Transaction PIN** – Required for sending funds to prevent unauthorized transfers.",
    ],
  },
  {
    id: "feed",
    icon: FileText,
    title: "Social Feed",
    color: "text-orange-500",
    content: [
      "Share your trading journey with the community.",
      "",
      "**Create Posts** – Write captions, add emojis, upload images or videos from your phone.",
      "**Tag Trades** – Attach your trade history records to posts. Win or loss, it auto-previews on your post card.",
      "**Tag Users** – Mention other traders in your posts using their Display ID.",
      "**Embed Videos** – Paste a YouTube or video link and it auto-embeds in your post.",
      "**Like & Comment** – Engage with other traders' posts.",
      "**Explore** – Browse all community posts on the Feed page.",
    ],
  },
  {
    id: "rooms",
    icon: MessageSquare,
    title: "Chat Rooms",
    color: "text-pink-500",
    content: [
      "Join or create group chat rooms for trading discussions.",
      "",
      "**Create Rooms** – Set a name, description, profile picture, and cover image for your room.",
      "**Join Rooms** – Browse available rooms and join manually. Some rooms require admin approval.",
      "**Premium Rooms** – Room creators can set a join fee. Upload payment proof to join premium rooms.",
      "**Room Admin Controls** – Creators can update room name, avatar, description, block/unblock users, and toggle approval mode.",
      "**Share Files** – Send images, videos, and files in chat (WhatsApp-style media cards).",
      "**Signal Generator** – Generate trade signal codes directly inside rooms for members to use.",
      "**Shareable Links** – Every room has a unique link you can share with anyone.",
      "**Report Users** – Report suspicious or abusive users from their profile or in rooms.",
    ],
  },
  {
    id: "games",
    icon: Gamepad2,
    title: "Room Games",
    color: "text-red-500",
    content: [
      "Play fun games in chat rooms to win real money from your wallet.",
      "",
      "**Coin Flip** – Create a 50/50 coin flip game. Choose Heads or Tails, set a stake amount. Another user joins and the winner takes all.",
      "**Jackpot Wheel** – Multiple users contribute to a pot. A wheel spins and one lucky winner takes the entire jackpot.",
      "**Fair Play** – Games resolve automatically. Once a game ends and rewards are paid, it disappears to prevent fraud.",
      "**Wallet Integration** – Stakes are deducted from your wallet. Winnings are credited instantly.",
    ],
  },
  {
    id: "copy-trading",
    icon: Users,
    title: "Copy Trading",
    color: "text-indigo-500",
    content: [
      "Follow successful traders and copy their trades.",
      "",
      "**Leaderboard** – See top traders ranked by win rate and total P&L.",
      "**Follow Leaders** – Choose a trader to follow and set a fixed amount per copied trade.",
      "**Auto-Copy** – When your leader opens a trade, the same trade opens in your account automatically.",
      "**Unfollow** – Stop copying a trader at any time.",
    ],
  },
  {
    id: "daily-streak",
    icon: Target,
    title: "Daily Streak & Signals",
    color: "text-amber-500",
    content: [
      "Stay consistent and get daily trading signals.",
      "",
      "**Daily Signals** – Admin posts fresh trade signals every day with entry, stop loss, and take profit levels.",
      "**Market News** – Read the latest forex and crypto market news and analysis.",
      "**Trading Guides** – Step-by-step educational content to improve your trading skills.",
      "**Streak Rewards** – Unlock premium content by maintaining your daily login streak.",
    ],
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications & Push Alerts",
    color: "text-sky-500",
    content: [
      "Never miss an important update.",
      "",
      "**Push Notifications** – Enable push notifications in your Profile to get alerts even when the app is closed.",
      "**Morning Brief** – AI-generated market overview every morning.",
      "**Midday Opportunities** – Trading opportunities delivered at midday.",
      "**Evening Recap** – Summary of the day's market movements every evening.",
      "**Activity Alerts** – Get notified about deposits, withdrawals, game results, room invites, and more.",
      "**Notification Settings** – Customize which notifications you receive and your preferred trading pairs.",
    ],
  },
  {
    id: "school",
    icon: BookOpen,
    title: "Trading School",
    color: "text-teal-500",
    content: [
      "Learn forex trading from scratch with our built-in school.",
      "",
      "**AI Mentor** – Chat with an AI trading coach that answers your questions and teaches concepts.",
      "**Lessons** – Structured lessons covering candlesticks, indicators, risk management, psychology, and more.",
      "**Pro Content** – Premium articles and video tutorials from experienced traders.",
      "**Practice** – Apply what you learn in Demo mode risk-free.",
    ],
  },
  {
    id: "kyc",
    icon: Shield,
    title: "KYC Verification",
    color: "text-lime-500",
    content: [
      "Verify your identity for enhanced security and higher limits.",
      "",
      "**Why Verify** – KYC-verified users get higher withdrawal limits and priority support.",
      "**What You Need** – Full name, date of birth, a valid government ID (front photo), and a selfie.",
      "**Process** – Upload your documents, admin reviews and approves or requests corrections.",
      "**Status** – Check your verification status anytime on your Profile page.",
    ],
  },
  {
    id: "security",
    icon: Lock,
    title: "Security & PIN",
    color: "text-rose-500",
    content: [
      "Keep your account and funds safe.",
      "",
      "**Transaction PIN** – A 4-digit PIN required for all withdrawals and fund transfers. Set it during registration or in Profile > Security Settings.",
      "**Phone Number** – Optionally add your phone number for account recovery.",
      "**Change PIN** – Update your PIN anytime from Profile > Security Settings.",
      "**Report Users** – Report suspicious accounts. Admin investigates and takes action.",
      "**Anti-Fraud System** – Our smart algorithm detects suspicious activity and alerts the admin automatically.",
    ],
  },
  {
    id: "profile",
    icon: Palette,
    title: "Profile & Customization",
    color: "text-violet-500",
    content: [
      "Personalize your experience.",
      "",
      "**Profile Picture** – Upload a custom avatar.",
      "**Background Theme** – Choose from 10 beautiful preset gradients or upload your own background image. It applies across the entire app.",
      "**Theme Mode** – Switch between Light, Dark, or System theme.",
      "**Currency** – Select your preferred display currency.",
      "**Display ID** – Your unique ID for receiving funds and being tagged in posts.",
    ],
  },
  {
    id: "invite",
    icon: Share2,
    title: "Invite & Referrals",
    color: "text-fuchsia-500",
    content: [
      "Grow the community and earn rewards.",
      "",
      "**Invite Link** – Share your unique referral link with friends.",
      "**Referral Rewards** – When someone signs up using your link, you may earn commission on their activities (if enabled by admin).",
      "**Track Referrals** – See how many people you've invited.",
    ],
  },
  {
    id: "smart-alerts",
    icon: Crown,
    title: "Smart Trading Alerts",
    color: "text-amber-600",
    content: [
      "Intelligent banners that help you trade better.",
      "",
      "**Losing Streak Detection** – If you're on a losing streak, the app suggests switching to Demo mode or studying in the Trading School.",
      "**Risk Warnings** – Get alerts when you're risking too much on a single trade.",
      "**Tips & Guidance** – Contextual tips appear based on your trading behavior to help you improve.",
    ],
  },
];

const RenderLine = ({ line }: { line: string }) => {
  if (!line) return <br />;
  const parts = line.split(/(\*\*[^*]+\*\*)/);
  return (
    <p className="text-sm text-muted-foreground leading-relaxed">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
};

const Help = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <Seo
        title="Help & FAQ — Felans FX"
        description="Learn how Felans FX works: AI chart analysis, live trading, signals, wallet, KYC, referrals and more."
        path="/help"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: sections.map((s) => ({
            "@type": "Question",
            name: `What is ${s.title}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: s.content.filter((l) => l).join(" ").replace(/\*\*/g, ""),
            },
          })),
        }}
      />
      <div className="px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-display font-bold">How Felans FX Works</h1>
            <p className="text-xs text-muted-foreground">Everything you need to know</p>
          </div>
        </div>

        <Card className="mb-6 border-0 shadow-md bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-5 pb-4">
            <p className="text-sm leading-relaxed">
              Welcome to <span className="font-bold text-primary">Felans FX</span> — your all-in-one forex & crypto trading platform.
              Trade live, analyze charts with AI, join chat rooms, play games, copy top traders, and much more.
              Read below to understand every feature available to you.
            </p>
          </CardContent>
        </Card>

        <Accordion type="single" collapsible className="space-y-2">
          {sections.map((section) => (
            <AccordionItem key={section.id} value={section.id} className="border rounded-xl bg-card px-1 shadow-sm">
              <AccordionTrigger className="hover:no-underline py-3 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <section.icon className={`w-4 h-4 ${section.color}`} />
                  </div>
                  <span className="text-sm font-semibold text-left">{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-4">
                <Separator className="mb-3" />
                <div className="space-y-1">
                  {section.content.map((line, i) => (
                    <RenderLine key={i} line={line} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Card className="mt-6 border-0 shadow-md">
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">Still have questions?</p>
            <Button className="gradient-primary shadow-primary" onClick={() => navigate("/school")}>
              <BookOpen className="w-4 h-4 mr-2" />
              Visit Trading School
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Help;
