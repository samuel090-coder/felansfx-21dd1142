import { useState, useEffect } from "react";
import {
  Send,
  Users,
  User,
  Sparkles,
  Mail,
  MessageSquare,
  RefreshCw,
  Clock,
  Bell,
  Gift,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  display_id: string | null;
}

interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: "welcome" | "reminder" | "update" | "custom";
}

const SITE_NAME = "FelansFX";
const SITE_URL = "https://felansfx.lovable.app";

// Professional message templates - no emojis, structured, catchy
const defaultTemplates: MessageTemplate[] = [
  {
    id: "welcome",
    name: "Welcome Message",
    type: "welcome",
    subject: `Welcome to ${SITE_NAME} - Your Trading Journey Starts Here`,
    body: `Dear {userName},

Thank you for joining ${SITE_NAME}. We are excited to have you as part of our growing community of traders.

Our platform offers powerful tools to enhance your trading experience:

- AI-Powered Chart Analysis: Upload your trading charts and receive detailed analysis with entry points, stop-loss, and take-profit recommendations tailored to your strategy.

- Live Trading: Execute trades directly on our platform with real-time market data. Practice with our demo account or trade with real funds when you are ready.

- Daily Market Insights: Access expert signals, market news, and educational content to stay ahead of market movements.

Getting Started:
1. Complete your profile setup
2. Add funds to your wallet
3. Start with our AI analysis or jump into live trading

Our support team is available to assist you with any questions. Simply reply to this email or visit our Help Center.

We look forward to supporting your trading success.

Best regards,
The ${SITE_NAME} Team

${SITE_URL}

---
This message was sent to you because you recently created an account on ${SITE_NAME}. If you did not create this account, please disregard this email.`,
  },
  {
    id: "reminder-inactive",
    name: "Inactive User Reminder",
    type: "reminder",
    subject: `We Miss You at ${SITE_NAME} - New Features Await`,
    body: `Dear {userName},

We noticed you have not visited ${SITE_NAME} recently, and we wanted to reach out.

Since your last visit, we have added exciting new features:

- Enhanced AI Analysis: Our algorithm has been upgraded for even more accurate trade signals
- New Trading Pairs: More currency pairs and assets are now available
- Improved Charts: Better visualization tools for your trading decisions

Your account is ready and waiting. Log in today to explore these improvements and continue your trading journey.

Need help getting started? Our support team is here for you.

See you on the platform,
The ${SITE_NAME} Team

${SITE_URL}`,
  },
  {
    id: "reminder-deposit",
    name: "Deposit Reminder",
    type: "reminder",
    subject: `Complete Your Setup at ${SITE_NAME}`,
    body: `Dear {userName},

Thank you for being part of ${SITE_NAME}. We noticed your wallet is ready for its first deposit.

Why fund your account today:

- Instant Access: Start live trading immediately after deposit
- AI Analysis: Use your balance for unlimited chart analyses
- Copy Trading: Follow top performers and mirror their trades

Funding your account is quick and secure. Visit your Finances section to get started.

If you have any questions about the deposit process, our support team is available to assist.

Best regards,
The ${SITE_NAME} Team

${SITE_URL}`,
  },
  {
    id: "update-features",
    name: "New Features Update",
    type: "update",
    subject: `New Features Released on ${SITE_NAME}`,
    body: `Dear {userName},

We are excited to announce new features on ${SITE_NAME} designed to improve your trading experience.

What is New:

1. Copy Trading System
   - Follow successful traders automatically
   - Mirror their trades with your preferred investment amount
   - Track leader performance in real-time

2. Enhanced Daily Signals
   - More frequent trading signals throughout the day
   - Detailed entry, exit, and stop-loss levels
   - Expert market analysis

3. Improved Mobile Experience
   - Faster loading times
   - Better chart interactions
   - Smoother navigation

Log in now to explore these features and take your trading to the next level.

Best regards,
The ${SITE_NAME} Team

${SITE_URL}`,
  },
  {
    id: "update-market",
    name: "Market Update (Newcastle style)",
    type: "update",
    subject: `Important Market Update from ${SITE_NAME}`,
    body: `Dear {userName},

The markets are showing significant activity, and we wanted to keep you informed.

Current Market Highlights:

- Major currency pairs are experiencing increased volatility
- Key economic events are scheduled this week
- Our AI signals have identified potential opportunities

Now is an excellent time to:
1. Check our Daily Signals for fresh trade ideas
2. Run AI analysis on your charts for updated recommendations
3. Review your open positions and adjust as needed

Stay ahead of the market with ${SITE_NAME}.

Best regards,
The ${SITE_NAME} Team

${SITE_URL}`,
  },
];

export const AdminMessagingCenter = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const [sendToAll, setSendToAll] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  const [messageForm, setMessageForm] = useState({
    subject: "",
    body: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, display_id")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers((data || []) as UserProfile[]);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = defaultTemplates.find((t) => t.id === templateId);
    if (template) {
      setMessageForm({
        subject: template.subject,
        body: template.body,
      });
    }
  };

  const processTemplate = (text: string, userName: string) => {
    return text.replace(/{userName}/g, userName || "Valued Trader");
  };

  const handleGenerateWithAI = async () => {
    setGenerating(true);
    try {
      // Use Lovable AI to generate a message
      const { data, error } = await supabase.functions.invoke("analyze-trade", {
        body: {
          prompt: `Generate a professional marketing email for a forex/crypto trading platform called "${SITE_NAME}". 
          The email should:
          - Be professional and catchy
          - NOT contain any emojis
          - Encourage users to use the platform for AI chart analysis and live trading
          - Be well-structured with clear sections
          - Include a call to action
          - End with the site URL: ${SITE_URL}
          - Be similar in tone to a fintech company
          
          Return ONLY the email body text, starting with "Dear {userName}," and ending with the site URL.`,
        },
      });

      if (error) throw error;
      
      if (data?.analysis_text) {
        setMessageForm({
          subject: `Exclusive Trading Insights from ${SITE_NAME}`,
          body: data.analysis_text,
        });
        toast.success("AI generated message ready");
      } else {
        throw new Error("No response from AI");
      }
    } catch (error: any) {
      console.error("AI generation error:", error);
      toast.error("AI generation failed. Using recommended template instead.");
      // Fallback to a recommended template
      handleSelectTemplate("update-features");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendMessage = () => {
    if (!messageForm.subject || !messageForm.body) {
      toast.error("Please fill in both subject and message");
      return;
    }

    if (!sendToAll && !selectedUserId) {
      toast.error("Please select a user or enable 'Send to All'");
      return;
    }

    setSending(true);

    try {
      if (sendToAll) {
        // Send to all users with email
        const usersWithEmail = users.filter((u) => u.email);
        if (usersWithEmail.length === 0) {
          toast.error("No users with email found");
          setSending(false);
          return;
        }

        // For all users, we'll open multiple mailto links (limited by browser)
        // In production, this would use an email service
        const bcc = usersWithEmail.map((u) => u.email).join(",");
        const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(
          messageForm.subject
        )}&body=${encodeURIComponent(processTemplate(messageForm.body, "Valued Trader"))}`;
        
        window.open(mailtoUrl, "_blank");
        toast.success(`Opening email for ${usersWithEmail.length} recipients`);
      } else {
        // Send to single user
        const user = users.find((u) => u.user_id === selectedUserId);
        if (!user?.email) {
          toast.error("Selected user has no email");
          setSending(false);
          return;
        }

        const userName = user.full_name || "Valued Trader";
        const mailtoUrl = `mailto:${user.email}?subject=${encodeURIComponent(
          messageForm.subject
        )}&body=${encodeURIComponent(processTemplate(messageForm.body, userName))}`;
        
        window.open(mailtoUrl, "_blank");
        toast.success(`Opening email for ${user.full_name || user.email}`);
      }

      // Clear form after sending
      setMessageForm({ subject: "", body: "" });
      setSelectedTemplate("");
      setSelectedUserId("");
    } catch (error: any) {
      toast.error(error.message || "Failed to prepare message");
    } finally {
      setSending(false);
    }
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case "welcome":
        return <Gift className="w-4 h-4" />;
      case "reminder":
        return <Clock className="w-4 h-4" />;
      case "update":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Messaging Center
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recipient Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Recipients</Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={sendToAll}
                onCheckedChange={setSendToAll}
                id="send-all"
              />
              <Label htmlFor="send-all" className="text-sm cursor-pointer">
                Send to All Users
              </Label>
            </div>
          </div>

          {!sendToAll && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border z-[100]">
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{user.full_name || "Unknown"}</span>
                      <span className="text-muted-foreground text-xs">
                        ({user.email || "No email"})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {sendToAll && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm">
                Message will be sent to <strong>{users.filter((u) => u.email).length}</strong> users with email addresses
              </span>
            </div>
          )}
        </div>

        {/* Template Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Message Templates</Label>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="all" className="text-xs py-2">All</TabsTrigger>
              <TabsTrigger value="welcome" className="text-xs py-2">Welcome</TabsTrigger>
              <TabsTrigger value="reminder" className="text-xs py-2">Reminder</TabsTrigger>
              <TabsTrigger value="update" className="text-xs py-2">Update</TabsTrigger>
            </TabsList>
            
            {["all", "welcome", "reminder", "update"].map((tabValue) => (
              <TabsContent key={tabValue} value={tabValue} className="mt-3">
                <div className="grid gap-2">
                  {defaultTemplates
                    .filter((t) => tabValue === "all" || t.type === tabValue)
                    .map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                          selectedTemplate === template.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        {getTemplateIcon(template.type)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {template.subject}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {template.type}
                        </Badge>
                      </button>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* AI Generate Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGenerateWithAI}
            disabled={generating}
          >
            {generating ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate with AI
              </>
            )}
          </Button>
        </div>

        {/* Message Composer */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Compose Message</Label>
          
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject..."
              value={messageForm.subject}
              onChange={(e) =>
                setMessageForm({ ...messageForm, subject: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body" className="text-sm">Message Body</Label>
            <Textarea
              id="body"
              placeholder="Write your message here... Use {userName} as placeholder for the recipient's name."
              value={messageForm.body}
              onChange={(e) =>
                setMessageForm({ ...messageForm, body: e.target.value })
              }
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            <p>Available placeholders: <code className="bg-muted px-1 rounded">{"{userName}"}</code></p>
          </div>
        </div>

        {/* Send Button */}
        <Button
          className="w-full gradient-primary"
          onClick={handleSendMessage}
          disabled={sending || (!sendToAll && !selectedUserId) || !messageForm.subject || !messageForm.body}
        >
          {sending ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {sendToAll
                ? `Send to All (${users.filter((u) => u.email).length} users)`
                : "Send Message"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
