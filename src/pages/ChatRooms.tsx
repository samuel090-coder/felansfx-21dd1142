import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const ChatRooms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [myRoomIds, setMyRoomIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchRooms = async () => {
    const { data } = await supabase.from("chat_rooms").select("*").eq("is_active", true).order("created_at", { ascending: false });
    setRooms(data || []);
    if (user) {
      const { data: members } = await supabase.from("chat_room_members").select("room_id").eq("user_id", user.id);
      setMyRoomIds(new Set((members || []).map(m => m.room_id)));
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

  const joinRoom = async (roomId: string) => {
    if (!user) return toast.error("Login required");
    await supabase.from("chat_room_members").insert({ room_id: roomId, user_id: user.id });
    setMyRoomIds(prev => new Set(prev).add(roomId));
    navigate(`/chat/${roomId}`);
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
          <Card key={room.id} className="cursor-pointer hover:bg-muted/30 transition-colors overflow-hidden" onClick={() => myRoomIds.has(room.id) ? navigate(`/chat/${room.id}`) : joinRoom(room.id)}>
            {/* Cover image */}
            {room.cover_image_url && (
              <div className="h-20 w-full bg-cover bg-center" style={{ backgroundImage: `url(${room.cover_image_url})` }} />
            )}
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={room.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{room.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{room.name}</p>
                {room.description && <p className="text-xs text-muted-foreground truncate">{room.description}</p>}
                <div className="flex items-center gap-1 mt-0.5">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{room.members_count || 0}</span>
                </div>
              </div>
              {myRoomIds.has(room.id) ? (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Joined</Badge>
              ) : (
                <Badge variant="outline">Join</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ChatRooms;
