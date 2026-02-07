import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  BookOpen, 
  Wallet,
  ArrowLeft,
  Loader2,
  GraduationCap,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { DepositFlow } from "@/components/school/DepositFlow";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  showDepositFlow?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trading-mentor`;

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hey there, future trader! 👋 I'm Coach Alex, your personal trading mentor here at FelansFX Academy! 🎓\n\nI'm here to teach you everything about trading - from reading charts to managing your risk like a pro! 📊\n\nWhat would you like to learn today? You can:\n\n📚 Ask me anything about trading\n📝 Request a lesson or assignment\n💰 Add funds to start practicing\n🎯 Get tips on chart analysis\n\nLet's begin your journey to becoming a confident trader! What's on your mind? 🚀",
  timestamp: new Date(),
};

const SchoolHub = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeDepositFlow, setActiveDepositFlow] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeDepositFlow]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Realtime listener for deposit approval/rejection
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('deposit-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deposits',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const deposit = payload.new as any;
          const oldDeposit = payload.old as any;

          // Only react to status changes
          if (oldDeposit.status === deposit.status) return;

          if (deposit.status === 'approved') {
            const congratsMsg: Message = {
              id: `system-approved-${Date.now()}`,
              role: 'assistant',
              content: `🎉🎉🎉 CONGRATULATIONS! 🎉🎉🎉\n\nYour deposit of ${formatCurrency(deposit.amount, "NGN")} has been APPROVED! ✅💰\n\nYour wallet has been credited and you're all set! You now have access to all premium features:\n\n🔥 Live Trading\n📊 AI Chart Analysis\n📈 Daily Signals & Market News\n👥 Copy Trading\n\nLet's put that capital to work! What would you like to do first? 🚀`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, congratsMsg]);
            await saveMessage(congratsMsg, user.id);
            refetchWallet();
            toast.success("Deposit approved! 🎉");
          } else if (deposit.status === 'rejected') {
            const rejectMsg: Message = {
              id: `system-rejected-${Date.now()}`,
              role: 'assistant',
              content: `😔 Unfortunately, your deposit of ${formatCurrency(deposit.amount, "NGN")} was not approved.\n\n${deposit.admin_notes ? `Reason: ${deposit.admin_notes}\n\n` : ''}Please make sure you:\n1. Upload a clear transfer confirmation screenshot\n2. Send the exact amount\n3. Transfer to the correct account\n\nWould you like to try again? Just say "deposit" and I'll help you! 💪`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, rejectMsg]);
            await saveMessage(rejectMsg, user.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Load chat history from database
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("school_chat_messages")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error loading chat history:", error);
          setMessages([WELCOME_MESSAGE]);
        } else if (data && data.length > 0) {
          // Convert DB records to Message format
          const loadedMessages: Message[] = data.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: new Date(msg.created_at),
          }));
          setMessages(loadedMessages);
        } else {
          // No history - show welcome message and save it
          setMessages([WELCOME_MESSAGE]);
          await saveMessage(WELCOME_MESSAGE, user.id);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
        setMessages([WELCOME_MESSAGE]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    if (user) {
      loadChatHistory();
    }
  }, [user]);

  // Save message to database
  const saveMessage = async (message: Message, userId: string) => {
    try {
      await supabase.from("school_chat_messages").insert({
        user_id: userId,
        role: message.role,
        content: message.content,
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  const clearChatHistory = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from("school_chat_messages")
        .delete()
        .eq("user_id", user.id);
      
      setMessages([WELCOME_MESSAGE]);
      await saveMessage(WELCOME_MESSAGE, user.id);
      toast.success("Chat history cleared!");
    } catch (error) {
      console.error("Failed to clear chat:", error);
      toast.error("Failed to clear chat history");
    }
  };

  const streamChat = useCallback(async (userMessages: Message[], userId: string) => {
    const apiMessages = userMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: apiMessages }),
    });

    if (!resp.ok || !resp.body) {
      throw new Error("Failed to start stream");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";
    let streamDone = false;
    let assistantMessageId = `assistant-${Date.now()}`;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.id === assistantMessageId) {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [
                ...prev,
                {
                  id: assistantMessageId,
                  role: "assistant",
                  content: assistantContent,
                  timestamp: new Date(),
                },
              ];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Save the complete assistant message to database
    if (assistantContent) {
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      };
      await saveMessage(assistantMessage, userId);
    }

    // Check if AI is initiating deposit flow
    const lowerContent = assistantContent.toLowerCase();
    if (
      (lowerContent.includes("how much") && lowerContent.includes("deposit")) ||
      (lowerContent.includes("ready to fund") || lowerContent.includes("let's add funds")) ||
      lowerContent.includes("start your deposit")
    ) {
      setActiveDepositFlow(true);
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    
    // Save user message to database
    await saveMessage(userMessage, user.id);

    // Check if user wants to deposit - handle directly
    const lowerInput = userMessage.content.toLowerCase();
    if (
      lowerInput.includes("deposit") || 
      lowerInput.includes("add funds") || 
      lowerInput.includes("fund my account") ||
      lowerInput.includes("add money")
    ) {
      initiateDeposit();
      return;
    }

    setIsLoading(true);

    try {
      await streamChat([...messages, userMessage], user.id);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Oops! Something went wrong 😅 Let's try that again!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      await saveMessage(errorMessage, user.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => {
      const form = document.getElementById("chat-form") as HTMLFormElement;
      form?.requestSubmit();
    }, 100);
  };

  const handleDepositComplete = async (message: string) => {
    setActiveDepositFlow(false);
    refetchWallet();
    
    const assistantMessage: Message = {
      id: `assistant-deposit-${Date.now()}`,
      role: "assistant",
      content: message,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, assistantMessage]);
    
    if (user) {
      await saveMessage(assistantMessage, user.id);
    }
  };

  const handleDepositCancel = async () => {
    setActiveDepositFlow(false);
    
    const cancelMessage: Message = {
      id: `assistant-cancel-${Date.now()}`,
      role: "assistant",
      content: "No problem! 😊 We can do that later whenever you're ready. Let's continue learning! What would you like to explore next? 📚",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, cancelMessage]);
    
    if (user) {
      await saveMessage(cancelMessage, user.id);
    }
  };

  const initiateDeposit = async () => {
    setActiveDepositFlow(true);
    
    const userDepositMessage: Message = {
      id: `user-deposit-${Date.now()}`,
      role: "user",
      content: "I want to deposit funds 💰",
      timestamp: new Date(),
    };
    
    const assistantInitMessage: Message = {
      id: `assistant-deposit-init-${Date.now()}`,
      role: "assistant",
      content: "Awesome! Let's add funds to your account! 💰✨\n\nI'll guide you through the process right here - no need to leave our chat!",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userDepositMessage, assistantInitMessage]);
    
    if (user) {
      await saveMessage(userDepositMessage, user.id);
      await saveMessage(assistantInitMessage, user.id);
    }
  };

  if (authLoading || isLoadingHistory) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-sm">Coach Alex</h1>
                <p className="text-xs text-muted-foreground">Trading Mentor 🎓</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChatHistory}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Card className="px-3 py-1.5 bg-secondary/50">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium">
                  {formatCurrency(wallet?.balance || 0, "NGN")}
                </span>
              </div>
            </Card>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted rounded-bl-md"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-[10px] opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Typing...</span>
              </div>
            </div>
          </div>
        )}

        {/* In-Chat Deposit Flow */}
        {activeDepositFlow && user && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="max-w-[90%]">
              <DepositFlow
                userId={user.id}
                onComplete={handleDepositComplete}
                onCancel={handleDepositCancel}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 text-xs"
            onClick={() => handleQuickAction("Give me a trading lesson 📚")}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Get Lesson
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 text-xs"
            onClick={() => handleQuickAction("Give me an assignment to practice 📝")}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Assignment
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 text-xs"
            onClick={() => handleQuickAction("Explain candlestick patterns 🕯️")}
          >
            📊 Candlesticks
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 text-xs"
            onClick={() => handleQuickAction("Teach me risk management 🎯")}
          >
            🛡️ Risk Tips
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 text-xs"
            onClick={() => handleQuickAction("I want to add funds to practice trading 💰")}
          >
            <Wallet className="w-3.5 h-3.5 mr-1.5" />
            Deposit
          </Button>
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 pb-safe">
        <form
          id="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Coach Alex anything..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SchoolHub;
