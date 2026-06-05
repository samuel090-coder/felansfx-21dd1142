import { useState } from "react";
import { ChevronUp, ChevronDown, Users, Trophy, TrendingUp, UserPlus, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyTrading } from "@/hooks/useCopyTrading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CopyTradingDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CopyTradingDrawer = ({ open: controlledOpen, onOpenChange }: CopyTradingDrawerProps = {}) => {
  const { leaders, loading, followLeader, unfollowLeader, isFollowing, getFollowAmount } = useCopyTrading();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };
  const [followAmount, setFollowAmount] = useState<number>(5000);
  const [selectedLeader, setSelectedLeader] = useState<string | null>(null);

  const handleFollow = async (leaderId: string) => {
    const success = await followLeader(leaderId, followAmount);
    if (success) {
      setSelectedLeader(null);
    }
  };

  return (
    <>
      {/* Toggle button (uncontrolled mode only) */}
      {!isControlled && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-24 left-2 z-40 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 flex items-center gap-2"
        >
          <Users className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Copy Trading</span>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setIsOpen(false)} />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed left-0 right-0 bottom-0 z-50 max-w-md mx-auto bg-card border-t border-border rounded-t-2xl transition-all duration-300 ease-out",
          isOpen ? "h-[55vh] opacity-100" : "h-0 opacity-0 pointer-events-none"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-foreground">Top Traders</span>
            </div>
            <span className="text-xs text-muted-foreground">{leaders.length} traders</span>
          </div>

          {/* Leader list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground text-sm">Loading...</div>
              </div>
            ) : leaders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
                <Users className="w-8 h-8 text-muted-foreground/50" />
                <div className="text-muted-foreground text-sm">No traders on leaderboard yet</div>
                <div className="text-muted-foreground/70 text-xs">
                  Traders need at least 5 real trades to appear here
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {leaders.map((leader, index) => {
                  const following = isFollowing(leader.user_id);
                  const currentAmount = getFollowAmount(leader.user_id);

                  return (
                    <div key={leader.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            index === 0
                              ? "bg-amber-500 text-amber-950"
                              : index === 1
                              ? "bg-gray-300 text-gray-800"
                              : index === 2
                              ? "bg-amber-700 text-amber-100"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {index + 1}
                        </div>

                        {/* Avatar */}
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={leader.avatar_url || undefined} />
                          <AvatarFallback>
                            {(leader.full_name || leader.display_id || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {leader.full_name || leader.display_id || "Trader"}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{leader.total_trades} trades</span>
                            <span>•</span>
                            <span className="text-emerald-400">{leader.win_rate}% win</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats + Follow */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div
                            className={cn(
                              "text-sm font-bold",
                              leader.total_pnl >= 0 ? "text-emerald-400" : "text-red-400"
                            )}
                          >
                            {leader.total_pnl >= 0 ? "+" : ""}₦{leader.total_pnl.toFixed(0)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">total P&L</div>
                        </div>

                        {following ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => unfollowLeader(leader.user_id)}
                          >
                            <UserMinus className="w-3 h-3" />
                            ₦{currentAmount}
                          </Button>
                        ) : (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                className="h-7 text-xs gap-1 bg-primary hover:bg-primary/90"
                                onClick={() => setSelectedLeader(leader.user_id)}
                              >
                                <UserPlus className="w-3 h-3" />
                                Copy
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm">
                              <DialogHeader>
                                <DialogTitle>Copy {leader.full_name || leader.display_id}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                  Enter a fixed amount (₦) to invest each time this trader opens a position.
                                </p>
                                <Input
                                  type="number"
                                  min={100}
                                  step={100}
                                  value={followAmount}
                                  onChange={(e) => setFollowAmount(Number(e.target.value))}
                                  placeholder="e.g. 5000"
                                />
                                <Button
                                  className="w-full"
                                  onClick={() => handleFollow(leader.user_id)}
                                >
                                  Start Copying
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
