import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Users, Share2, Lock, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const ChatRooms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [rooms, setRooms] = useState<any[]>([]);
  const [myRoomIds, setMyRoomIds] = useState<Set<string>>(new Set());
  const [myRequests, setMyRequests] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null);

  const fetchRooms = async () => {
    const { data } = await supabase.from("chat_rooms").select("*").eq("is_active", true).order("created_at", { ascending: false });
    setRooms(data || []);
    if (user) {
      const { data: members } = await supabase.from("chat_room_members").select("room_id").eq("user_id", user.id);
      setMyRoomIds(new Set((members || []).map(m => m.room_id)));
      const { data: requests } = await supabase.from("room_join_requests").select("room_id, status").eq("user_id", user.id);
      const reqMap: Record<string, string> = {};
      (requests || []).forEach(r => { reqMap[r.room_id] = r.status; });
      setMyRequests(reqMap);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, [user]);

  const createRoom = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from("chat_rooms").insert({ name: newName.trim(), description: newDesc.trim() || null, created_by: user.id }).select().single();
    if (data) {
      await supabase.from("chat_room_members").insert({ room_id: data.id, user_id: user.id });
      toast.success("Room created! 🎉");
      setDialogOpen(false);
      setNewName(""); setNewDesc("");
      fetchRooms();
    } else toast.error("Failed to create room");
    setCreating(false);
  };

  const handleJoin = async (room: any) => {
    if (!user) return toast.error("Login required");
    
    // Already a member
    if (myRoomIds.has(room.id)) {
      navigate(`/chat/${room.id}`);
      return;
    }

    setJoiningRoom(room.id);

    // Check if blocked
    const { data: blocked } = await supabase.from("chat_room_blocked_users").select("id").eq("room_id", room.id).eq("user_id", user.id).maybeSingle();
    if (blocked) {
      toast.error("You are blocked from this room");
      setJoiningRoom(null);
      return;
    }

    // Premium room - needs wallet payment
    if (room.is_premium && room.join_price > 0) {
      if (!wallet || wallet.balance < room.join_price) {
        toast.error(`Insufficient balance. Need ₦${room.join_price.toLocaleString()}`);
        setJoiningRoom(null);
        return;
      }
      const { data: ok } = await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: room.join_price });
      if (!ok) {
        toast.error("Payment failed");
        setJoiningRoom(null);
        return;
      }
      refetchWallet();
      await supabase.from("chat_room_members").insert({ room_id: room.id, user_id: user.id });
      setMyRoomIds(prev => new Set(prev).add(room.id));
      toast.success(`Paid ₦${room.join_price.toLocaleString()} — Welcome! 🎉`);
      navigate(`/chat/${room.id}`);
      setJoiningRoom(null);
      return;
    }

    // Requires approval
    if (room.requires_approval) {
      await supabase.from("room_join_requests").upsert({ room_id: room.id, user_id: user.id, status: "pending" }, { onConflict: "room_id,user_id" });
      setMyRequests(prev => ({ ...prev, [room.id]: "pending" }));
      toast.success("Join request sent! Wait for approval.");
      setJoiningRoom(null);
      return;
    }

    // Free room - direct join
    await supabase.from("chat_room_members").insert({ room_id: room.id, user_id: user.id });
    setMyRoomIds(prev => new Set(prev).add(room.id));
    navigate(`/chat/${room.id}`);
    setJoiningRoom(null);
  };

  const shareRoom = (room: any) => {
    const url = `${window.location.origin}/chat/${room.id}`;
    if (navigator.share) {
      navigator.share({ title: `Join ${room.name} on FelansFX`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Room link copied!");
    }
  };

  const getJoinLabel = (room: any) => {
    if (myRoomIds.has(room.id)) return "Joined";
    if (myRequests[room.id] === "pending") return "Pending";
    if (room.is_premium && room.join_price > 0) return `₦${room.join_price.toLocaleString()}`;
    if (room.requires_approval) return "Request";
    return "Join";
  };

  const getJoinVariant = (room: any) => {
    if (myRoomIds.has(room.id)) return "default";
    if (myRequests[room.id] === "pending") return "secondary";
    return "outline";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-lg font-bold flex-1">Chat Rooms</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Chat Room</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <Input placeholder="Room name" value={newName} onChange={e => setNewName(e.target.value)} />
              <Input placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              <Button className="w-full" onClick={createRoom} disabled={creating || !newName.trim()}>
                {creating ? "Creating..." : "Create Room"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>
        ) : rooms.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No rooms yet. Create one!</p>
        ) : rooms.map(room => (
          <Card key={room.id} className="overflow-hidden">
            {room.cover_image_url && (
              <div className="h-20 w-full bg-cover bg-center" style={{ backgroundImage: `url(${room.cover_image_url})` }} />
            )}
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={room.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{room.name[0]}</AvatarFallback>
              </Avatar>
              <div className={`flex-1 min-w-0 ${myRoomIds.has(room.id) ? 'cursor-pointer' : ''}`} onClick={() => myRoomIds.has(room.id) && navigate(`/chat/${room.id}`)}>
                <div className="flex items-center gap-1">
                  <p className="font-semibold text-sm truncate">{room.name}</p>
                  {room.is_premium && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                </div>
                {room.description && <p className="text-xs text-muted-foreground truncate">{room.description}</p>}
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{room.members_count || 0}</span>
                  </div>
                  {room.requires_approval && <div className="flex items-center gap-0.5"><Clock className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Approval</span></div>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Button
                  size="sm"
                  variant={getJoinVariant(room) as any}
                  className={`text-xs h-7 ${myRoomIds.has(room.id) ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}`}
                  onClick={() => handleJoin(room)}
                  disabled={joiningRoom === room.id || myRequests[room.id] === "pending"}
                >
                  {joiningRoom === room.id ? "..." : getJoinLabel(room)}
                </Button>
                <button onClick={(e) => { e.stopPropagation(); shareRoom(room); }} className="text-muted-foreground hover:text-foreground">
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ChatRooms;
