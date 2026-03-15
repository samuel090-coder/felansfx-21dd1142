import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Send, Zap, Copy, Settings, Ban, Users, Camera, Image, TrendingUp, TrendingDown, Play, Coins, Share2, DollarSign, Target } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { usePriceSimulation } from "@/hooks/usePriceSimulation";
import { useWallet } from "@/hooks/useWallet";
import JackpotWheel from "@/components/chat/JackpotWheel";

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "NAS100", "BTCUSD", "ETHUSD", "XAGUSD"];

const ChatRoom = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [room, setRoom] = useState<any>(null);
  const [isMember, setIsMember] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showSignalGen, setShowSignalGen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [showJackpot, setShowJackpot] = useState(false);
  const [showMoneyRequest, setShowMoneyRequest] = useState(false);
  const [requestTargetUser, setRequestTargetUser] = useState<any>(null);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [signalSymbol, setSignalSymbol] = useState("XAUUSD");
  const [signalType, setSignalType] = useState<"BUY" | "SELL">("BUY");
  const [signalEntry, setSignalEntry] = useState("");
  const [signalSL, setSignalSL] = useState("");
  const [signalTP, setSignalTP] = useState("");
  const [signalNotes, setSignalNotes] = useState("");
  const [generatingSignal, setGeneratingSignal] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editApproval, setEditApproval] = useState(false);
  const [editPremium, setEditPremium] = useState(false);
  const [editPrice, setEditPrice] = useState("0");
  const [stakingSignal, setStakingSignal] = useState<any>(null);
  const [stakeAmount, setStakeAmount] = useState("100");
  const [stakeDuration, setStakeDuration] = useState(60);
  const [placingStake, setPlacingStake] = useState(false);
  // Coin flip
  const [flipAmount, setFlipAmount] = useState("100");
  const [flipChoice, setFlipChoice] = useState<"heads" | "tails">("heads");
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [flipping, setFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { currentPrice } = usePriceSimulation(signalSymbol, 3000);
  const isCreator = room?.created_by === user?.id;

  useEffect(() => {
    if (!roomId || !user) return;
    const init = async () => {
      const { data: roomData } = await supabase.from("chat_rooms").select("*").eq("id", roomId).single();
      if (roomData) {
        setRoom(roomData);
        setEditName(roomData.name);
        setEditDesc(roomData.description || "");
        setEditApproval(roomData.requires_approval || false);
        setEditPremium(roomData.is_premium || false);
        setEditPrice(String(roomData.join_price || 0));
      }
      // Check membership
      const { data: mem } = await supabase.from("chat_room_members").select("id").eq("room_id", roomId).eq("user_id", user.id).maybeSingle();
      if (mem) {
        setIsMember(true);
        loadMessages();
        loadMembers();
        loadGames();
      } else {
        // Check if blocked
        const { data: blocked } = await supabase.from("chat_room_blocked_users").select("id").eq("room_id", roomId).eq("user_id", user.id).maybeSingle();
        if (blocked) {
          toast.error("You are blocked from this room");
          navigate("/chat-rooms");
        }
      }
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

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (currentPrice && showSignalGen) setSignalEntry(currentPrice.toFixed(signalSymbol.includes("JPY") ? 3 : 5));
  }, [currentPrice, showSignalGen, signalSymbol]);

  const loadMessages = async () => {
    const { data } = await supabase.from("chat_messages").select("*").eq("room_id", roomId).order("created_at", { ascending: true }).limit(200);
    if (data) {
      setMessages(data);
      const uids = [...new Set(data.map(m => m.user_id))];
      if (uids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, display_id, avatar_url").in("user_id", uids);
        if (profs) {
          const pm: Record<string, any> = {};
          profs.forEach(p => { pm[p.user_id] = p; });
          setProfiles(prev => ({ ...prev, ...pm }));
        }
      }
    }
  };

  const loadProfileById = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, display_id, avatar_url").eq("user_id", userId).maybeSingle();
    if (data) setProfiles(prev => ({ ...prev, [userId]: data }));
  };

  const loadMembers = async () => {
    if (!roomId) return;
    const { data } = await supabase.from("chat_room_members").select("*").eq("room_id", roomId);
    if (data) {
      const uids = data.map(m => m.user_id);
      if (uids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, display_id, avatar_url").in("user_id", uids);
        setMembers((profs || []).map(p => ({ ...p, member: data.find(m => m.user_id === p.user_id) })));
      }
    }
    const { data: blocked } = await supabase.from("chat_room_blocked_users").select("*").eq("room_id", roomId);
    setBlockedUsers(blocked || []);
    // Load join requests if creator
    if (isCreator) {
      const { data: reqs } = await supabase.from("room_join_requests").select("*").eq("room_id", roomId).eq("status", "pending");
      if (reqs && reqs.length > 0) {
        const uids = reqs.map(r => r.user_id);
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, display_id, avatar_url").in("user_id", uids);
        const pm = Object.fromEntries((profs || []).map(p => [p.user_id, p]));
        setJoinRequests(reqs.map(r => ({ ...r, profile: pm[r.user_id] })));
      } else {
        setJoinRequests([]);
      }
    }
  };

  const loadGames = async () => {
    if (!roomId) return;
    // Only show waiting (open) coin flip games — resolved ones should disappear
    const { data } = await supabase.from("coin_flip_games").select("*").eq("room_id", roomId).eq("status", "waiting").order("created_at", { ascending: false }).limit(20);
    setActiveGames(data || []);
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
    const { error } = await supabase.from("chat_rooms").update({
      name: editName.trim(),
      description: editDesc.trim() || null,
      requires_approval: editApproval,
      is_premium: editPremium,
      join_price: editPremium ? parseFloat(editPrice) || 0 : 0,
    }).eq("id", roomId);
    if (!error) {
      setRoom((r: any) => ({ ...r, name: editName.trim(), description: editDesc.trim(), requires_approval: editApproval, is_premium: editPremium, join_price: editPremium ? parseFloat(editPrice) || 0 : 0 }));
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

  const handleJoinRequest = async (reqId: string, userId: string, approve: boolean) => {
    if (!isCreator || !roomId) return;
    await supabase.from("room_join_requests").update({ status: approve ? "approved" : "declined", reviewed_at: new Date().toISOString() }).eq("id", reqId);
    if (approve) {
      await supabase.from("chat_room_members").insert({ room_id: roomId, user_id: userId });
      toast.success("Member approved!");
    } else {
      toast.success("Request declined");
    }
    loadMembers();
  };

  const shareRoom = () => {
    const url = `${window.location.origin}/chat/${roomId}`;
    if (navigator.share) navigator.share({ title: `Join ${room?.name} on FelansFX`, url });
    else { navigator.clipboard.writeText(url); toast.success("Room link copied!"); }
  };

  // Signal generation
  const generateSignal = async () => {
    if (!user || !roomId || !signalEntry || !signalSL || !signalTP) {
      toast.error("Fill in entry, SL and TP"); return;
    }
    setGeneratingSignal(true);
    try {
      const signalCode = `SIG-${signalSymbol}-${Date.now().toString(36).toUpperCase()}`;
      const rr = Math.abs((parseFloat(signalTP) - parseFloat(signalEntry)) / (parseFloat(signalEntry) - parseFloat(signalSL))).toFixed(1);
      const signalContent = `📊 LIVE SIGNAL — ${signalSymbol}\n\nDirection: ${signalType === "BUY" ? "🟢 BUY" : "🔴 SELL"}\nEntry: ${signalEntry}\nStop Loss: ${signalSL}\nTake Profit: ${signalTP}\nR:R Ratio: 1:${rr}\nLive Price: ${currentPrice?.toFixed(signalSymbol.includes("JPY") ? 3 : 5) || "—"}\n${signalNotes ? `\n📝 ${signalNotes}\n` : ""}\n🔑 Code: ${signalCode}`;
      await supabase.from("chat_messages").insert({
        room_id: roomId, user_id: user.id, content: signalContent, message_type: "signal",
        signal_data: { symbol: signalSymbol, code: signalCode, type: signalType, entry: signalEntry, sl: signalSL, tp: signalTP, rr, live_price: currentPrice },
      });
      setShowSignalGen(false);
      setSignalNotes("");
      toast.success(`Signal generated! Code: ${signalCode}`);
    } catch { toast.error("Failed to generate signal"); }
    setGeneratingSignal(false);
  };

  const handleUseSignal = (msg: any) => {
    if (!msg.signal_data) return;
    setStakingSignal(msg.signal_data);
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
      await supabase.from("demo_positions").insert({
        user_id: user.id, symbol: stakingSignal.symbol, trade_type: stakingSignal.type.toLowerCase(),
        entry_price: parseFloat(stakingSignal.entry), current_price: parseFloat(stakingSignal.entry),
        amount, leverage: 1, status: "open", account_type: "real",
      });
      refetchWallet();
      toast.success(`${stakingSignal.type} ${stakingSignal.symbol} — ₦${amount} staked!`);
      setStakingSignal(null);
      await supabase.from("chat_messages").insert({ room_id: roomId, user_id: user.id, content: `⚡ Used signal ${stakingSignal.code}\n${stakingSignal.type} ${stakingSignal.symbol} — ₦${amount}`, message_type: "text" });
    } catch (e: any) { toast.error(e.message || "Stake failed"); }
    setPlacingStake(false);
  };

  // COIN FLIP GAME
  const createCoinFlip = async () => {
    if (!user || !roomId) return;
    const amount = parseFloat(flipAmount);
    if (isNaN(amount) || amount < 50) return toast.error("Min stake is ₦50");
    if (!wallet || wallet.balance < amount) return toast.error("Insufficient balance");
    setFlipping(true);
    try {
      const { data: ok } = await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: amount });
      if (!ok) throw new Error("Deduction failed");
      const { data: game, error } = await supabase.from("coin_flip_games").insert({
        room_id: roomId, creator_id: user.id, stake_amount: amount, creator_choice: flipChoice, status: "waiting",
      }).select().single();
      if (error) {
        await supabase.rpc("credit_user_wallet", { p_user_id: user.id, p_amount: amount });
        throw new Error("Failed to create game");
      }
      refetchWallet();
      toast.success(`Coin flip created! ₦${amount} on ${flipChoice}. Waiting for opponent...`);
      await supabase.from("chat_messages").insert({ room_id: roomId, user_id: user.id, content: `🪙 COIN FLIP CHALLENGE\n\n💰 Stake: ₦${amount.toLocaleString()}\n🎯 My Pick: ${flipChoice.toUpperCase()}\n\nWho dares to accept? 👀`, message_type: "text" });
      setShowCoinFlip(false);
      loadGames();
    } catch (e: any) { toast.error(e.message); }
    setFlipping(false);
  };

  const acceptCoinFlip = async (game: any) => {
    if (!user || !roomId || game.creator_id === user.id) return;
    if (!wallet || wallet.balance < game.stake_amount) return toast.error("Insufficient balance");
    setFlipping(true);
    try {
      const { data: ok } = await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: game.stake_amount });
      if (!ok) throw new Error("Deduction failed");

      // Provably fair: use crypto random
      const randomBytes = new Uint8Array(1);
      crypto.getRandomValues(randomBytes);
      const result = randomBytes[0] % 2 === 0 ? "heads" : "tails";
      const winnerId = result === game.creator_choice ? game.creator_id : user.id;
      const totalPot = game.stake_amount * 2;

      // Update game
      await supabase.from("coin_flip_games").update({
        opponent_id: user.id, result, winner_id: winnerId, status: "resolved", resolved_at: new Date().toISOString(),
      }).eq("id", game.id);

      // Credit winner
      await supabase.rpc("credit_user_wallet", { p_user_id: winnerId, p_amount: totalPot });
      refetchWallet();

      const iWon = winnerId === user.id;
      setFlipResult({ result, won: iWon, amount: totalPot });

      const creatorProfile = profiles[game.creator_id];
      await supabase.from("chat_messages").insert({
        room_id: roomId, user_id: user.id,
        content: `🪙 COIN FLIP RESULT: ${result.toUpperCase()}!\n\n${iWon ? "🎉 I won" : `😤 ${creatorProfile?.full_name || "Opponent"} won`} ₦${totalPot.toLocaleString()}!`,
        message_type: "text",
      });
      loadGames();
    } catch (e: any) { toast.error(e.message); }
    setFlipping(false);
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
          <div className={`rounded-2xl px-3 py-2 text-sm ${isSignal ? 'bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30' : isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {isSignal && (
              <div className="flex items-center gap-1 mb-1">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold text-primary">LIVE SIGNAL</span>
                {msg.signal_data?.code && (
                  <button onClick={() => { navigator.clipboard.writeText(msg.signal_data.code); toast.success("Code copied!"); }} className="ml-auto flex items-center gap-0.5 text-[10px] text-primary">
                    <Copy className="w-3 h-3" /> {msg.signal_data.code}
                  </button>
                )}
              </div>
            )}
            <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
            {isSignal && msg.signal_data && msg.user_id !== user?.id && (
              <Button size="sm" className="w-full mt-2 gap-1 text-xs" onClick={() => handleUseSignal(msg)}>
                <Play className="w-3 h-3" /> Use Signal — Stake Now
              </Button>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5 px-1">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</p>
        </div>
      </div>
    );
  };

  // If not a member, show a join prompt
  if (!isMember && room) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {room.cover_image_url && (
          <div className="h-40 w-full bg-cover bg-center relative" style={{ backgroundImage: `url(${room.cover_image_url})` }}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center -mt-12 relative z-10">
          <Avatar className="w-20 h-20 mb-4">
            <AvatarImage src={room.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{room.name[0]}</AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold mb-1">{room.name}</h2>
          {room.description && <p className="text-sm text-muted-foreground mb-4">{room.description}</p>}
          <p className="text-xs text-muted-foreground mb-6">{room.members_count} members</p>
          <p className="text-sm text-muted-foreground mb-4">You're not a member of this room yet.</p>
          <Button className="w-full max-w-xs" onClick={() => navigate("/chat-rooms")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go to Chat Rooms to Join
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
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
        <Button variant="ghost" size="icon" onClick={shareRoom}><Share2 className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => setShowCoinFlip(true)}><Coins className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => setShowJackpot(true)}><Target className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => navigate("/send-funds")}><DollarSign className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => { loadMembers(); setShowMembers(true); }}><Users className="w-4 h-4" /></Button>
        {isCreator && <Button variant="ghost" size="icon" onClick={() => { loadMembers(); setShowSettings(true); }}><Settings className="w-4 h-4" /></Button>}
        <Button variant="outline" size="sm" onClick={() => setShowSignalGen(true)}><Zap className="w-4 h-4 mr-1" /> Signal</Button>
      </div>

      {/* Active coin flip games */}
      {activeGames.filter(g => g.status === "waiting").length > 0 && (
        <div className="shrink-0 border-b border-border p-2 space-y-1.5 bg-muted/30">
          {activeGames.filter(g => g.status === "waiting").map(g => (
            <div key={g.id} className="flex items-center justify-between bg-background rounded-xl px-3 py-2 border border-amber-500/30">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium">₦{g.stake_amount.toLocaleString()}</span>
                <Badge variant="outline" className="text-[9px]">{g.creator_choice.toUpperCase()}</Badge>
              </div>
              {g.creator_id !== user?.id ? (
                <Button size="sm" className="h-6 text-[10px]" onClick={() => acceptCoinFlip(g)} disabled={flipping}>
                  {flipping ? "..." : "Accept Flip"}
                </Button>
              ) : (
                <span className="text-[10px] text-muted-foreground">Waiting...</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map(renderMessage)}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 border-t border-border p-3 flex gap-2">
        <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()} placeholder="Type a message..." className="flex-1" />
        <Button size="icon" onClick={sendMessage} disabled={sending || !text.trim()}><Send className="w-4 h-4" /></Button>
      </div>

      {/* Signal Generator Sheet */}
      <Sheet open={showSignalGen} onOpenChange={setShowSignalGen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader><SheetTitle>📊 Live Signal Generator</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">Generate a live market signal from real prices.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Pair</label>
              <div className="flex flex-wrap gap-1.5">
                {SYMBOLS.map(s => (<Button key={s} variant={signalSymbol === s ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setSignalSymbol(s)}>{s}</Button>))}
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Live Price</span>
              <span className="font-mono font-bold text-sm text-primary">{currentPrice?.toFixed(signalSymbol.includes("JPY") ? 3 : 5) || "Loading..."}</span>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={signalType === "BUY" ? "default" : "outline"} onClick={() => setSignalType("BUY")} className="gap-1"><TrendingUp className="w-4 h-4" /> BUY</Button>
                <Button variant={signalType === "SELL" ? "default" : "outline"} onClick={() => setSignalType("SELL")} className="gap-1"><TrendingDown className="w-4 h-4" /> SELL</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-[10px] text-muted-foreground">Entry</label><Input value={signalEntry} onChange={e => setSignalEntry(e.target.value)} className="h-8 text-xs" /></div>
              <div><label className="text-[10px] text-muted-foreground">Stop Loss</label><Input value={signalSL} onChange={e => setSignalSL(e.target.value)} className="h-8 text-xs" placeholder="SL" /></div>
              <div><label className="text-[10px] text-muted-foreground">Take Profit</label><Input value={signalTP} onChange={e => setSignalTP(e.target.value)} className="h-8 text-xs" placeholder="TP" /></div>
            </div>
            <Input value={signalNotes} onChange={e => setSignalNotes(e.target.value)} placeholder="Analysis notes (optional)" className="text-xs" />
            <Button className="w-full" onClick={generateSignal} disabled={generatingSignal}>{generatingSignal ? "Generating..." : `⚡ Generate ${signalSymbol} Signal`}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Use Signal Dialog */}
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
              <Button className="w-full" onClick={placeStakeFromSignal} disabled={placingStake}>{placingStake ? "Placing..." : `Stake ₦${stakeAmount} on ${stakingSignal.type}`}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Coin Flip Sheet */}
      <Sheet open={showCoinFlip} onOpenChange={setShowCoinFlip}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader><SheetTitle>🪙 Coin Flip — 50/50</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">Create a coin flip challenge. Another member accepts and a provably fair flip decides the winner. Winner takes both stakes.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Pick</label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={flipChoice === "heads" ? "default" : "outline"} onClick={() => setFlipChoice("heads")}>👑 Heads</Button>
                <Button variant={flipChoice === "tails" ? "default" : "outline"} onClick={() => setFlipChoice("tails")}>🦅 Tails</Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Stake Amount (₦)</label>
              <Input value={flipAmount} onChange={e => setFlipAmount(e.target.value)} type="number" placeholder="100" />
              <p className="text-[10px] text-muted-foreground mt-1">Balance: ₦{wallet?.balance?.toLocaleString() || 0}</p>
            </div>
            <Button className="w-full" onClick={createCoinFlip} disabled={flipping}>{flipping ? "Creating..." : `🪙 Create Flip — ₦${flipAmount}`}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Coin Flip Result Dialog */}
      <Dialog open={!!flipResult} onOpenChange={(o) => !o && setFlipResult(null)}>
        <DialogContent className="text-center">
          <DialogHeader><DialogTitle>🪙 Coin Flip Result!</DialogTitle></DialogHeader>
          {flipResult && (
            <div className="space-y-4 py-4">
              <div className="text-6xl animate-bounce">{flipResult.result === "heads" ? "👑" : "🦅"}</div>
              <p className="text-xl font-bold">{flipResult.result.toUpperCase()}</p>
              <p className={`text-lg font-bold ${flipResult.won ? 'text-green-500' : 'text-red-500'}`}>
                {flipResult.won ? `You won ₦${flipResult.amount.toLocaleString()}! 🎉` : `You lost! 😤`}
              </p>
              <Button className="w-full" onClick={() => setFlipResult(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Room Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader><SheetTitle>⚙️ Room Settings</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Room name" />
            <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" />

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Approve New Members</p>
                <p className="text-[10px] text-muted-foreground">Manually approve or decline join requests</p>
              </div>
              <Switch checked={editApproval} onCheckedChange={setEditApproval} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Premium Room</p>
                <p className="text-[10px] text-muted-foreground">Charge users to join</p>
              </div>
              <Switch checked={editPremium} onCheckedChange={setEditPremium} />
            </div>

            {editPremium && (
              <div>
                <label className="text-xs text-muted-foreground">Join Price (₦)</label>
                <Input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" placeholder="1000" />
              </div>
            )}

            <Button className="w-full" onClick={updateRoom}>Save Changes</Button>

            <div className="grid grid-cols-2 gap-2">
              <label className="cursor-pointer">
                <div className="border border-dashed border-border rounded-xl p-3 text-center text-xs text-muted-foreground hover:bg-muted/30 transition">
                  <Camera className="w-5 h-5 mx-auto mb-1" /> Profile Picture
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadRoomImage(e.target.files[0], "avatar")} />
              </label>
              <label className="cursor-pointer">
                <div className="border border-dashed border-border rounded-xl p-3 text-center text-xs text-muted-foreground hover:bg-muted/30 transition">
                  <Image className="w-5 h-5 mx-auto mb-1" /> Cover Image
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadRoomImage(e.target.files[0], "cover")} />
              </label>
            </div>

            {/* Join Requests */}
            {joinRequests.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Pending Join Requests ({joinRequests.length})</p>
                {joinRequests.map(req => (
                  <div key={req.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={req.profile?.avatar_url} />
                      <AvatarFallback className="text-xs">{(req.profile?.full_name || "U")[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs flex-1 truncate">{req.profile?.full_name || req.profile?.display_id || "Trader"}</span>
                    <Button size="sm" className="h-6 text-[10px]" onClick={() => handleJoinRequest(req.id, req.user_id, true)}>Approve</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive" onClick={() => handleJoinRequest(req.id, req.user_id, false)}>Decline</Button>
                  </div>
                ))}
              </div>
            )}

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

      {/* Jackpot Wheel */}
      <JackpotWheel
        roomId={roomId!}
        profiles={profiles}
        open={showJackpot}
        onOpenChange={setShowJackpot}
        onGameMessage={async (content) => {
          if (user && roomId) {
            await supabase.from("chat_messages").insert({ room_id: roomId, user_id: user.id, content, message_type: "text" });
          }
        }}
      />
    </div>
  );
};

export default ChatRoom;
