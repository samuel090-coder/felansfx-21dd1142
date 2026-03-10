import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Zap, Copy } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDistanceToNow } from "date-fns";

const ChatRoom = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showSignalGen, setShowSignalGen] = useState(false);
  const [signalSymbol, setSignalSymbol] = useState("XAUUSD");
  const [generatingSignal, setGeneratingSignal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;
    supabase.from("chat_rooms").select("*").eq("id", roomId).single().then(({ data }) => setRoom(data));
    loadMessages();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        loadProfile(payload.new.user_id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase.from("chat_messages").select("*").eq("room_id", roomId).order("created_at", { ascending: true }).limit(200);
    if (data) {
      setMessages(data);
      const uids = [...new Set(data.map(m => m.user_id))];
      for (const uid of uids) loadProfile(uid);
    }
  };

  const loadProfile = async (userId: string) => {
    if (profiles[userId]) return;
    const { data } = await supabase.from("profiles").select("full_name, display_id, avatar_url").eq("user_id", userId).maybeSingle();
    if (data) setProfiles(prev => ({ ...prev, [userId]: data }));
  };

  const sendMessage = async () => {
    if (!user || !text.trim() || !roomId) return;
    setSending(true);
    await supabase.from("chat_messages").insert({ room_id: roomId, user_id: user.id, content: text.trim() });
    setText("");
    setSending(false);
  };

  const generateSignal = async () => {
    if (!user || !roomId) return;
    setGeneratingSignal(true);
    try {
      const { data, error } = await supabase.functions.invoke("trading-mentor", {
        body: {
          messages: [
            { role: "user", content: `Generate a professional forex signal analysis for ${signalSymbol}. Include: direction (BUY/SELL), entry price range, stop loss, take profit 1 & 2, risk-reward ratio, confidence level (1-10), and a brief analysis. Format it clearly as a trading signal card.` }
          ]
        }
      });

      if (error) throw error;

      // Parse streaming response or direct response
      let signalText = "";
      if (typeof data === "string") {
        // Parse SSE
        const lines = data.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(line.slice(6));
              signalText += parsed.choices?.[0]?.delta?.content || "";
            } catch {}
          }
        }
      } else {
        signalText = data?.choices?.[0]?.message?.content || "Signal generation failed";
      }

      // Generate signal code
      const signalCode = `SIG-${signalSymbol}-${Date.now().toString(36).toUpperCase()}`;

      // Send as special message
      await supabase.from("chat_messages").insert({
        room_id: roomId,
        user_id: user.id,
        content: signalText,
        message_type: "signal",
        signal_data: { symbol: signalSymbol, code: signalCode }
      });

      setShowSignalGen(false);
      toast.success(`Signal generated! Code: ${signalCode}`);
    } catch (e) {
      toast.error("Failed to generate signal");
    }
    setGeneratingSignal(false);
  };

  const renderMessage = (msg: any) => {
    const profile = profiles[msg.user_id];
    const isMe = msg.user_id === user?.id;
    const isSignal = msg.message_type === "signal";

    return (
      <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">{(profile?.full_name || "U")[0]}</AvatarFallback>
        </Avatar>
        <div className={`max-w-[75%] ${isMe ? 'items-end' : ''}`}>
          <p className="text-[10px] text-muted-foreground mb-0.5 px-1">{profile?.full_name || profile?.display_id || "Trader"}</p>
          <div className={`rounded-2xl px-3 py-2 text-sm ${
            isSignal
              ? 'bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30'
              : isMe
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
          }`}>
            {isSignal && (
              <div className="flex items-center gap-1 mb-1">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold text-primary">AI SIGNAL</span>
                {msg.signal_data?.code && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(msg.signal_data.code); toast.success("Code copied!"); }}
                    className="ml-auto flex items-center gap-0.5 text-[10px] text-primary"
                  >
                    <Copy className="w-3 h-3" /> {msg.signal_data.code}
                  </button>
                )}
              </div>
            )}
            <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5 px-1">
            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    );
  };

  const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "NAS100", "BTCUSD", "ETHUSD"];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 bg-background/80 backdrop-blur-lg border-b border-border p-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/chat-rooms")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{room?.name || "Chat Room"}</p>
          <p className="text-xs text-muted-foreground truncate">{room?.description || ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSignalGen(true)}>
          <Zap className="w-4 h-4 mr-1" /> Signal
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map(renderMessage)}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 border-t border-border p-3 flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button size="icon" onClick={sendMessage} disabled={sending || !text.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Signal Generator Sheet */}
      <Sheet open={showSignalGen} onOpenChange={setShowSignalGen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader><SheetTitle>🔮 AI Signal Generator</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Select a pair to generate an AI-powered trading signal with a shareable code.</p>
            <div className="flex flex-wrap gap-2">
              {SYMBOLS.map(s => (
                <Button
                  key={s}
                  variant={signalSymbol === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSignalSymbol(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
            <Button className="w-full" onClick={generateSignal} disabled={generatingSignal}>
              {generatingSignal ? "Generating..." : `⚡ Generate ${signalSymbol} Signal`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ChatRoom;
