import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const WHEEL_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"];

interface JackpotWheelProps {
  roomId: string;
  profiles: Record<string, any>;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onGameMessage: (content: string) => void;
}

const JackpotWheel = ({ roomId, profiles, open, onOpenChange, onGameMessage }: JackpotWheelProps) => {
  const { user } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [entries, setEntries] = useState<Record<string, any[]>>({});
  const [entryAmount, setEntryAmount] = useState("100");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [spinning, setSpinning] = useState<string | null>(null);
  const [spinResult, setSpinResult] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open) loadGames();
  }, [open]);

  const loadGames = async () => {
    // Only show open games — resolved/spinning ones disappear after completion
    const { data } = await supabase.from("jackpot_games").select("*").eq("room_id", roomId)
      .eq("status", "open").order("created_at", { ascending: false }).limit(10);
    setActiveGames(data || []);
    // Load entries for each game
    if (data) {
      for (const g of data) {
        const { data: ents } = await supabase.from("jackpot_entries").select("*").eq("game_id", g.id);
        setEntries(prev => ({ ...prev, [g.id]: ents || [] }));
      }
    }
  };

  const createJackpot = async () => {
    if (!user) return;
    const amt = parseFloat(entryAmount);
    if (isNaN(amt) || amt < 50) return toast.error("Min entry is ₦50");
    if (!wallet || wallet.balance < amt) return toast.error("Insufficient balance");
    setCreating(true);
    try {
      const { data: ok } = await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: amt });
      if (!ok) throw new Error("Deduction failed");

      const { data: game, error } = await supabase.from("jackpot_games").insert({
        room_id: roomId, created_by: user.id, total_pot: amt, min_entry: 50, max_players: 6, status: "open",
      }).select().single();

      if (error || !game) {
        await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: -amt });
        throw new Error("Failed");
      }

      await supabase.from("jackpot_entries").insert({ game_id: game.id, user_id: user.id, amount: amt });
      refetchWallet();
      onGameMessage(`🎰 JACKPOT WHEEL CREATED!\n\n💰 Starting Pot: ₦${amt.toLocaleString()}\n👥 Max Players: 6\n📌 Min Entry: ₦50\n\nHigher contribution = bigger slice = higher win chance!\nJoin now to win the entire pot! 🔥`);
      toast.success("Jackpot created!");
      loadGames();
    } catch (e: any) { toast.error(e.message); }
    setCreating(false);
  };

  const joinJackpot = async (game: any) => {
    if (!user) return;
    const amt = parseFloat(entryAmount);
    if (isNaN(amt) || amt < game.min_entry) return toast.error(`Min entry is ₦${game.min_entry}`);
    if (!wallet || wallet.balance < amt) return toast.error("Insufficient balance");
    
    const gameEntries = entries[game.id] || [];
    if (gameEntries.find(e => e.user_id === user.id)) return toast.error("Already entered!");
    if (gameEntries.length >= game.max_players) return toast.error("Game is full!");

    setJoining(game.id);
    try {
      const { data: ok } = await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: amt });
      if (!ok) throw new Error("Deduction failed");

      const { error } = await supabase.from("jackpot_entries").insert({ game_id: game.id, user_id: user.id, amount: amt });
      if (error) {
        await supabase.rpc("deduct_user_wallet", { p_user_id: user.id, p_amount: -amt });
        throw new Error("Entry failed");
      }

      // Update total pot
      await supabase.from("jackpot_games").update({ total_pot: game.total_pot + amt }).eq("id", game.id);
      refetchWallet();
      onGameMessage(`🎰 Joined Jackpot!\n💰 Added ₦${amt.toLocaleString()} to the pot\n🏆 Total Pot: ₦${(game.total_pot + amt).toLocaleString()}`);
      toast.success("Joined jackpot!");
      loadGames();
    } catch (e: any) { toast.error(e.message); }
    setJoining(null);
  };

  const spinWheel = async (game: any) => {
    if (!user) return;
    const gameEntries = entries[game.id] || [];
    if (gameEntries.length < 2) return toast.error("Need at least 2 players to spin!");
    // Only creator can spin
    if (game.created_by !== user.id) return toast.error("Only creator can spin the wheel!");

    setSpinning(game.id);
    try {
      const gameEntries = entries[game.id] || [];
      const totalWeight = gameEntries.reduce((sum: number, e: any) => sum + e.amount, 0);

      // Resolve on server side to prevent fraud
      const { data, error } = await supabase.functions.invoke("resolve-jackpot", {
        body: { game_id: game.id },
      });

      if (error || !data?.success) throw new Error(data?.error || "Resolution failed");

      const winnerId = data.winner_id;

      // Animate wheel client-side (visual only - result already decided server-side)
      await animateWheel(gameEntries, winnerId, totalWeight);

      // Immediately remove from active games list
      setActiveGames(prev => prev.filter(g => g.id !== game.id));

      refetchWallet();
      const winnerProfile = profiles[winnerId];
      const winnerName = winnerProfile?.full_name || winnerProfile?.display_id || "Unknown";
      
      setSpinResult({ winnerId, winnerName, amount: data.total_pot, isMe: winnerId === user.id });
      
      onGameMessage(`🎰 JACKPOT WHEEL RESULT!\n\n🏆 Winner: ${winnerName}\n💰 Won: ₦${data.total_pot.toLocaleString()}\n\n${winnerId === user.id ? "🎉 Congratulations!" : "Better luck next time! 💪"}`);
    } catch (e: any) { toast.error(e.message); }
    setSpinning(null);
  };

  const animateWheel = (gameEntries: any[], winnerId: string, totalWeight: number): Promise<void> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) { resolve(); return; }
      const ctx = canvas.getContext("2d")!;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.min(cx, cy) - 10;

      let rotation = 0;
      const totalSpins = 5 + Math.random() * 3; // 5-8 full spins
      const totalFrames = 180; // ~3 seconds at 60fps
      let frame = 0;

      // Find winner's segment center angle for landing
      let winnerAngle = 0;
      let cumAngle = 0;
      for (const entry of gameEntries) {
        const sliceAngle = (entry.amount / totalWeight) * Math.PI * 2;
        if (entry.user_id === winnerId) {
          winnerAngle = cumAngle + sliceAngle / 2;
          break;
        }
        cumAngle += sliceAngle;
      }
      const targetRotation = totalSpins * Math.PI * 2 - winnerAngle + Math.PI / 2; // land at top

      const draw = () => {
        frame++;
        // Easing: cubic ease-out
        const progress = frame / totalFrames;
        const eased = 1 - Math.pow(1 - progress, 3);
        rotation = eased * targetRotation;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw slices
        let startAngle = rotation;
        gameEntries.forEach((entry: any, i: number) => {
          const sliceAngle = (entry.amount / totalWeight) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
          ctx.closePath();
          ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
          ctx.fill();
          ctx.strokeStyle = "#1a1a2e";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Label
          const midAngle = startAngle + sliceAngle / 2;
          const labelR = radius * 0.65;
          ctx.save();
          ctx.translate(cx + Math.cos(midAngle) * labelR, cy + Math.sin(midAngle) * labelR);
          ctx.rotate(midAngle + Math.PI / 2);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          const p = profiles[entry.user_id];
          ctx.fillText((p?.full_name || "Player").slice(0, 8), 0, 0);
          ctx.font = "9px sans-serif";
          ctx.fillText(`₦${entry.amount.toLocaleString()}`, 0, 13);
          ctx.restore();

          startAngle += sliceAngle;
        });

        // Center
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fillStyle = "#1a1a2e";
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🎰", cx, cy);

        // Arrow pointer at top
        ctx.beginPath();
        ctx.moveTo(cx - 10, 5);
        ctx.lineTo(cx + 10, 5);
        ctx.lineTo(cx, 20);
        ctx.closePath();
        ctx.fillStyle = "#FF6B6B";
        ctx.fill();

        if (frame < totalFrames) {
          requestAnimationFrame(draw);
        } else {
          resolve();
        }
      };
      draw();
    });
  };

  const getWinChance = (gameEntries: any[], userId: string) => {
    const total = gameEntries.reduce((s: number, e: any) => s + e.amount, 0);
    const mine = gameEntries.find(e => e.user_id === userId);
    if (!mine || total === 0) return 0;
    return ((mine.amount / total) * 100).toFixed(1);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader><SheetTitle>🎰 Jackpot Wheel</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Higher contribution = bigger slice = higher win chance. Creator spins when ready. Winner takes the entire pot!
            </p>

            {/* Active Games */}
            {activeGames.map(game => {
              const gameEntries = entries[game.id] || [];
              const myEntry = gameEntries.find(e => e.user_id === user?.id);
              const isFull = gameEntries.length >= game.max_players;
              const canSpin = game.created_by === user?.id && gameEntries.length >= 2;

              return (
                <div key={game.id} className="bg-muted/50 rounded-xl p-4 space-y-3 border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">🏆 Pot: ₦{game.total_pot.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{gameEntries.length}/{game.max_players} players</p>
                    </div>
                    {canSpin && (
                      <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white h-8" 
                        onClick={() => spinWheel(game)} disabled={!!spinning}>
                        {spinning === game.id ? "Spinning..." : "🎰 SPIN"}
                      </Button>
                    )}
                  </div>

                  {/* Canvas for wheel */}
                  <canvas ref={canvasRef} width={280} height={280} className="mx-auto rounded-xl" />

                  {/* Players */}
                  <div className="space-y-1">
                    {gameEntries.map((entry: any, i: number) => {
                      const p = profiles[entry.user_id];
                      return (
                        <div key={entry.id} className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: WHEEL_COLORS[i % WHEEL_COLORS.length] }} />
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={p?.avatar_url} />
                            <AvatarFallback className="text-[8px]">{(p?.full_name || "U")[0]}</AvatarFallback>
                          </Avatar>
                          <span className="flex-1 truncate">{p?.full_name || "Player"}</span>
                          <span className="font-mono">₦{entry.amount.toLocaleString()}</span>
                          <Badge variant="outline" className="text-[8px] h-4">{getWinChance(gameEntries, entry.user_id)}%</Badge>
                        </div>
                      );
                    })}
                  </div>

                  {/* Join */}
                  {!myEntry && !isFull && (
                    <div className="flex gap-2">
                      <Input value={entryAmount} onChange={e => setEntryAmount(e.target.value)} type="number" placeholder={`Min ₦${game.min_entry}`} className="flex-1 h-8 text-xs" />
                      <Button size="sm" className="h-8" onClick={() => joinJackpot(game)} disabled={!!joining}>
                        {joining === game.id ? "..." : "Join"}
                      </Button>
                    </div>
                  )}
                  {myEntry && <p className="text-[10px] text-center text-primary">You're in! Win chance: {getWinChance(gameEntries, user?.id || "")}%</p>}
                  {isFull && !myEntry && <p className="text-[10px] text-center text-muted-foreground">Game is full</p>}
                </div>
              );
            })}

            {/* Create New */}
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-medium">Create New Jackpot</p>
              <div>
                <label className="text-xs text-muted-foreground">Your Entry (₦)</label>
                <Input value={entryAmount} onChange={e => setEntryAmount(e.target.value)} type="number" placeholder="100" />
                <p className="text-[10px] text-muted-foreground mt-1">Balance: ₦{wallet?.balance?.toLocaleString() || 0}</p>
              </div>
              <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white" onClick={createJackpot} disabled={creating}>
                {creating ? "Creating..." : `🎰 Create Jackpot — ₦${entryAmount}`}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Result Dialog */}
      <Dialog open={!!spinResult} onOpenChange={(o) => !o && setSpinResult(null)}>
        <DialogContent className="text-center">
          <DialogHeader><DialogTitle>🎰 Jackpot Result!</DialogTitle></DialogHeader>
          {spinResult && (
            <div className="space-y-4 py-4">
              <div className="text-6xl animate-bounce">🏆</div>
              <p className="text-xl font-bold">{spinResult.winnerName}</p>
              <p className={`text-lg font-bold ${spinResult.isMe ? 'text-green-500' : 'text-red-500'}`}>
                {spinResult.isMe ? `You won ₦${spinResult.amount.toLocaleString()}! 🎉` : `Won ₦${spinResult.amount.toLocaleString()}`}
              </p>
              <Button className="w-full" onClick={() => setSpinResult(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default JackpotWheel;
