import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Zap, Copy, Settings, Ban, Users, Camera, Image, TrendingUp, TrendingDown, Play } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { usePriceSimulation } from "@/hooks/usePriceSimulation";
import { useWallet } from "@/hooks/useWallet";

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "NAS100", "BTCUSD", "ETHUSD", "XAGUSD"];

const ChatRoom = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [room, setRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showSignalGen, setShowSignalGen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [signalSymbol, setSignalSymbol] = useState("XAUUSD");
  const [signalType, setSignalType] = useState<"BUY" | "SELL">("BUY");
  const [signalEntry, setSignalEntry] = useState("");
  const [signalSL, setSignalSL] = useState("");
  const [signalTP, setSignalTP] = useState("");
  const [signalNotes, setSignalNotes] = useState("");
  const [generatingSignal, setGeneratingSignal] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [stakingSignal, setStakingSignal] = useState<any>(null);
  const [stakeAmount, setStakeAmount] = useState("100");
  const [stakeDuration, setStakeDuration] = useState(60);
  const [placingStake, setPlacingStake] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { currentPrice } = usePriceSimulation(signalSymbol, 3000);
  const isCreator = room?.created_by === user?.id;

  // Auto-join room if not already a member
  const ensureMembership = async () => {
    if (!user || !roomId) return;
    const { data: existing } = await supabase
      .from("chat_room_members")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      // Check if blocked
      const { data: blocked } = await supabase
        .from("chat_room_blocked_users")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (blocked) {
        toast.error("You are blocked from this room");
        navigate("/chat-rooms");
        return;
      }
      await supabase.from("chat_room_members").insert({ room_id: roomId, user_id: user.id });
    }
  };

  useEffect(() => {
    if (!roomId || !user) return;

    const init = async () => {
      // Load room info first (public read)
      const { data: roomData } = await supabase.from("chat_rooms").select("*").eq("id", roomId).single();
      if (roomData) {
        setRoom(roomData);
        setEditName(roomData.name);
        setEditDesc(roomData.description || "");
      }

      // Ensure user is a member before loading messages
      await ensureMembership();
      loadMessages();
      loadMembers();
    };
    init();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        loadProfileById(payload.new.user_id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (currentPrice && showSignalGen) {
      setSignalEntry(currentPrice.toFixed(signalSymbol.includes("JPY") ? 3 : 5));
    }
  }, [currentPrice, showSignalGen, signalSymbol]);

  const loadMessages = async () => {
    const { data } = await supabase.from("chat_messages").select("*").eq("room_id", roomId).order("created_at", { ascending: true }).limit(200);
    if (data) {
      setMessages(data);
      const uids = [...new Set(data.map(m => m.user_id))];
      // Batch load all profiles at once
      if (uids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, display_id, avatar_url").in("user_id", uids);
        if (profs) {
          const profileMap: Record<string, any> = {};
          profs.forEach(p => { profileMap[p.user_id] = p; });
          setProfiles(prev => ({ ...prev, ...profileMap }));
        }
      }
    }
  };

  const loadProfileById = async (userId: string) => {
    // Always fetch fresh to avoid stale closure issues
    const { data } = await supabase.from("profiles").select("user_id, full_name, display_id, avatar_url").eq("user_id", userId).maybeSingle();
    if (data) setProfiles(prev => ({ ...prev, [userId]: data }));
  };

  const loadMembers = async () => {
    if (!roomId) return;
    const { data } = await supabase.from("chat_room_members").select("*").eq("room_id", roomId);
    if (data) {
      const uids = data.map(m => m.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, display_id, avatar_url").in("user_id", uids);
      setMembers((profs || []).map(p => ({ ...p, member: data.find(m => m.user_id === p.user_id) })));
    }
    const { data: blocked } = await supabase.from("chat_room_blocked_users").select("*").eq("room_id", roomId);
    setBlockedUsers(blocked || []);
  };

  const sendMessage = async () => {
    if (!user || !text.trim() || !roomId) return;
    setSending(true);
    await supabase.from("chat_messages").insert({ room_id: roomId, user_id: user.id, content: text.trim() });
    setText("");
    setSending(false);
  };

  const updateRoom = async () => {
    if (!isCreator || !roomId) return;
    const { error } = await supabase.from("chat_rooms").update({ name: editName.trim(), description: editDesc.trim() || null }).eq("id", roomId);
    if (!error) {
      setRoom((r: any) => ({ ...r, name: editName.trim(), description: editDesc.trim() }));
      toast.success("Room updated!");
    } else toast.error("Update failed");
  };

  const uploadRoomImage = async (file: File, type: "avatar" | "cover") => {
    if (!isCreator || !roomId) return;
    const path = `rooms/${roomId}/${type}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
    if (upErr) return toast.error("Upload failed");
    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
    const col = type === "avatar" ? "avatar_url" : "cover_image_url";
    await supabase.from("chat_rooms").update({ [col]: urlData.publicUrl }).eq("id", roomId);
    setRoom((r: any) => ({ ...r, [col]: urlData.publicUrl }));
    toast.success(`${type === "avatar" ? "Profile" : "Cover"} image updated!`);
  };

  const blockUser = async (userId: string) => {
    if (!isCreator || !roomId) return;
    await supabase.from("chat_room_blocked_users").insert({ room_id: roomId, user_id: userId, blocked_by: user!.id });
    await supabase.from("chat_room_members").delete().eq("room_id", roomId).eq("user_id", userId);
    toast.success("User blocked");
    loadMembers();
  };

  const unblockUser = async (userId: string) => {
    if (!isCreator || !roomId) return;
    await supabase.from("chat_room_blocked_users").delete().eq("room_id", roomId).eq("user_id", userId);
    toast.success("User unblocked");
    loadMembers();
  };

  const generateSignal = async () => {
    if (!user || !roomId || !signalEntry || !signalSL || !signalTP) {
      toast.error("Fill in entry, SL and TP");
      return;
    }
    setGeneratingSignal(true);
    try {
      const signalCode = `SIG-${signalSymbol}-${Date.now().toString(36).toUpperCase()}`;
      const rr = Math.abs((parseFloat(signalTP) - parseFloat(signalEntry)) / (parseFloat(signalEntry) - parseFloat(signalSL))).toFixed(1);

      const signalContent = `📊 LIVE SIGNAL — ${signalSymbol}\n\n` +
        `Direction: ${signalType === "BUY" ? "🟢 BUY" : "🔴 SELL"}\n` +
        `Entry: ${signalEntry}\n` +
        `Stop Loss: ${signalSL}\n` +
        `Take Profit: ${signalTP}\n` +
        `R:R Ratio: 1:${rr}\n` +
        `Live Price: ${currentPrice?.toFixed(signalSymbol.includes("JPY") ? 3 : 5) || "—"}\n` +
        (signalNotes ? `\n📝 ${signalNotes}\n` : "") +
        `\n🔑 Code: ${signalCode}`;

      await supabase.from("chat_messages").insert({
        room_id: roomId,
        user_id: user.id,
        content: signalContent,
        message_type: "signal",
        signal_data: {
          symbol: signalSymbol,
          code: signalCode,
          type: signalType,
          entry: signalEntry,
          sl: signalSL,
          tp: signalTP,
          rr: rr,
          live_price: currentPrice,
        }
      });

      setShowSignalGen(false);
      setSignalNotes("");
      toast.success(`Signal generated! Code: ${signalCode}`);
    } catch {
      toast.error("Failed to generate signal");
    }
    setGeneratingSignal(false);
  };

  const handleUseSignal = (msg: any) => {
    const sd = msg.signal_data;
    if (!sd) return;
    setStakingSignal(sd);
    setStakeAmount("100");
  };

  const placeStakeFromSignal = async () => {
    if (!user || !stakingSignal) return;
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount < 50) return toast.error("Min stake is ₦50");
    if (!wallet || wallet.balance < amount) return toast.error("Insufficient balance");

    setPlacingStake(true);
    try {
      const { data: ok, error: dErr } = await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: amount });
      if (dErr || !ok) throw new Error("Deduction failed");

      const { data: pos, error: pErr } = await supabase.from("demo_positions").insert({
        user_id: user.id,
        symbol: stakingSignal.symbol,
        trade_type: stakingSignal.type.toLowerCase(),
        entry_price: parseFloat(stakingSignal.entry),
        current_price: parseFloat(stakingSignal.entry),
        amount,
        leverage: 1,
        status: "open",
        account_type: "real",
      }).select().single();

      if (pErr) {
        await supabase.rpc("credit_user_wallet", { p_user_id: user.id, p_amount: amount });
        throw new Error("Position failed");
      }

      refetchWallet();
      toast.success(`${stakingSignal.type} ${stakingSignal.symbol} — ₦${amount} staked!`);
      setStakingSignal(null);

      // Post confirmation in chat
      await supabase.from("chat_messages").insert({
        room_id: roomId,
        user_id: user.id,
        content: `⚡ Used signal ${stakingSignal.code}\n${stakingSignal.type} ${stakingSignal.symbol} — ₦${amount}`,
        message_type: "text",
      });
    } catch (e: any) {
      toast.error(e.message || "Stake failed");
    }
    setPlacingStake(false);
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
        <div className={`max-w-[80%] ${isMe ? 'items-end' : ''}`}>
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
                <span className="text-[10px] font-bold text-primary">LIVE SIGNAL</span>
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
            {isSignal && msg.signal_data && msg.user_id !== user?.id && (
              <Button
                size="sm"
                className="w-full mt-2 gap-1 text-xs"
                onClick={() => handleUseSignal(msg)}
              >
                <Play className="w-3 h-3" /> Use Signal — Stake Now
              </Button>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5 px-1">
            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Cover image */}
      {room?.cover_image_url && (
        <div className="h-28 w-full bg-cover bg-center shrink-0 relative" style={{ backgroundImage: `url(${room.cover_image_url})` }}>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 bg-background/80 backdrop-blur-lg border-b border-border p-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/chat-rooms")}><ArrowLeft className="w-5 h-5" /></Button>
        <Avatar className="w-9 h-9">
          <AvatarImage src={room?.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{(room?.name || "R")[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{room?.name || "Chat Room"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{room?.members_count || 0} members</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => { loadMembers(); setShowMembers(true); }}>
          <Users className="w-4 h-4" />
        </Button>
        {isCreator && (
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4" />
          </Button>
        )}
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

      {/* Signal Generator Sheet - Live Market Based */}
      <Sheet open={showSignalGen} onOpenChange={setShowSignalGen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader><SheetTitle>📊 Live Signal Generator</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">Generate a live market signal from real prices. Others can use it to stake instantly.</p>

            {/* Symbol */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Pair</label>
              <div className="flex flex-wrap gap-1.5">
                {SYMBOLS.map(s => (
                  <Button key={s} variant={signalSymbol === s ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setSignalSymbol(s)}>{s}</Button>
                ))}
              </div>
            </div>

            {/* Live price indicator */}
            <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Live Price</span>
              <span className="font-mono font-bold text-sm text-primary">{currentPrice?.toFixed(signalSymbol.includes("JPY") ? 3 : 5) || "Loading..."}</span>
            </div>

            {/* Direction */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={signalType === "BUY" ? "default" : "outline"} onClick={() => setSignalType("BUY")} className="gap-1">
                  <TrendingUp className="w-4 h-4" /> BUY
                </Button>
                <Button variant={signalType === "SELL" ? "default" : "outline"} onClick={() => setSignalType("SELL")} className="gap-1">
                  <TrendingDown className="w-4 h-4" /> SELL
                </Button>
              </div>
            </div>

            {/* Entry / SL / TP */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Entry</label>
                <Input value={signalEntry} onChange={e => setSignalEntry(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Stop Loss</label>
                <Input value={signalSL} onChange={e => setSignalSL(e.target.value)} className="h-8 text-xs" placeholder="SL" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Take Profit</label>
                <Input value={signalTP} onChange={e => setSignalTP(e.target.value)} className="h-8 text-xs" placeholder="TP" />
              </div>
            </div>

            <Input value={signalNotes} onChange={e => setSignalNotes(e.target.value)} placeholder="Analysis notes (optional)" className="text-xs" />

            <Button className="w-full" onClick={generateSignal} disabled={generatingSignal}>
              {generatingSignal ? "Generating..." : `⚡ Generate ${signalSymbol} Signal`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Use Signal - Stake Dialog */}
      <Dialog open={!!stakingSignal} onOpenChange={(o) => !o && setStakingSignal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>⚡ Use Signal — Stake</DialogTitle></DialogHeader>
          {stakingSignal && (
            <div className="space-y-3 mt-2">
              <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-xs">
                <p className="font-bold text-sm">{stakingSignal.type === "BUY" ? "🟢" : "🔴"} {stakingSignal.type} {stakingSignal.symbol}</p>
                <p>Entry: {stakingSignal.entry} | SL: {stakingSignal.sl} | TP: {stakingSignal.tp}</p>
                <p>R:R 1:{stakingSignal.rr}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Stake Amount (₦)</label>
                <Input value={stakeAmount} onChange={e => setStakeAmount(e.target.value)} type="number" />
                <p className="text-[10px] text-muted-foreground mt-1">Balance: ₦{wallet?.balance?.toLocaleString() || 0}</p>
              </div>
              <Button className="w-full" onClick={placeStakeFromSignal} disabled={placingStake}>
                {placingStake ? "Placing..." : `Stake ₦${stakeAmount} on ${stakingSignal.type}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Room Settings Sheet (Creator only) */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader><SheetTitle>⚙️ Room Settings</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Room name" />
            <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" />
            <Button className="w-full" onClick={updateRoom}>Save Changes</Button>

            <div className="grid grid-cols-2 gap-2">
              <label className="cursor-pointer">
                <div className="border border-dashed border-border rounded-xl p-3 text-center text-xs text-muted-foreground hover:bg-muted/30 transition">
                  <Camera className="w-5 h-5 mx-auto mb-1" />
                  Profile Picture
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadRoomImage(e.target.files[0], "avatar")} />
              </label>
              <label className="cursor-pointer">
                <div className="border border-dashed border-border rounded-xl p-3 text-center text-xs text-muted-foreground hover:bg-muted/30 transition">
                  <Image className="w-5 h-5 mx-auto mb-1" />
                  Cover Image
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadRoomImage(e.target.files[0], "cover")} />
              </label>
            </div>

            {/* Blocked users */}
            {blockedUsers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Blocked Users</p>
                {blockedUsers.map(bu => (
                  <div key={bu.id} className="flex items-center justify-between py-1.5">
                    <span className="text-xs">{bu.user_id.slice(0, 8)}...</span>
                    <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => unblockUser(bu.user_id)}>Unblock</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Members Sheet */}
      <Sheet open={showMembers} onOpenChange={setShowMembers}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto">
          <SheetHeader><SheetTitle>👥 Members ({members.length})</SheetTitle></SheetHeader>
          <div className="space-y-2 mt-4">
            {members.map(m => (
              <div key={m.user_id} className="flex items-center gap-3 py-2">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={m.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{(m.full_name || "U")[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.full_name || m.display_id || "Trader"}</p>
                  {m.user_id === room?.created_by && <Badge className="text-[9px] h-4 bg-primary/10 text-primary">Admin</Badge>}
                </div>
                {isCreator && m.user_id !== user?.id && (
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => blockUser(m.user_id)}>
                    <Ban className="w-3 h-3 mr-1" /> Block
                  </Button>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ChatRoom;
