import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface LiveTrader {
  id: string;
  user_id: string;
  symbol: string;
  trade_type: "buy" | "sell";
  amount: number;
  entry_price: number;
  avatar_url?: string;
  display_name?: string;
}

interface LiveTradersOverlayProps {
  symbol: string;
  currentPrice: number;
  priceRange: { min: number; max: number };
  className?: string;
}

export const LiveTradersOverlay = ({ 
  symbol, 
  currentPrice, 
  priceRange,
  className 
}: LiveTradersOverlayProps) => {
  const { user } = useAuth();
  const [liveTraders, setLiveTraders] = useState<LiveTrader[]>([]);

  // Subscribe to real-time open positions for this symbol
  useEffect(() => {
    // Fetch initial live trades (only open positions for current symbol)
    const fetchLiveTrades = async () => {
      const { data: positions, error } = await supabase
        .from("demo_positions")
        .select(`
          id,
          user_id,
          symbol,
          trade_type,
          amount,
          entry_price
        `)
        .eq("symbol", symbol)
        .eq("status", "open")
        .neq("user_id", user?.id || ""); // Exclude current user
      
      if (error) {
        console.error("Error fetching live trades:", error);
        return;
      }

      if (positions && positions.length > 0) {
        // Fetch profiles for these users
        const userIds = [...new Set(positions.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, avatar_url, full_name, display_id")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const traders: LiveTrader[] = positions.map(pos => {
          const profile = profileMap.get(pos.user_id);
          return {
            id: pos.id,
            user_id: pos.user_id,
            symbol: pos.symbol,
            trade_type: pos.trade_type as "buy" | "sell",
            amount: pos.amount,
            entry_price: pos.entry_price,
            avatar_url: profile?.avatar_url || undefined,
            display_name: profile?.full_name || profile?.display_id || "Trader",
          };
        });

        setLiveTraders(traders);
      } else {
        setLiveTraders([]);
      }
    };

    fetchLiveTrades();

    // Subscribe to real-time changes on demo_positions
    const channel = supabase
      .channel(`live-trades-${symbol}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demo_positions',
          filter: `symbol=eq.${symbol}`,
        },
        (payload) => {
          console.log("Position change:", payload);
          // Refetch all positions on any change
          fetchLiveTrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbol, user?.id]);

  // Calculate Y position based on entry price relative to current price range
  const calculateYPosition = (entryPrice: number): number => {
    const range = priceRange.max - priceRange.min;
    if (range === 0) return 50;
    
    const position = ((priceRange.max - entryPrice) / range) * 100;
    return Math.max(10, Math.min(90, position));
  };

  // Calculate X position based on when trade was opened (spread across chart)
  const calculateXPosition = (index: number, total: number): number => {
    if (total === 1) return 50;
    const spacing = 70 / (total + 1);
    return 15 + spacing * (index + 1);
  };

  if (liveTraders.length === 0) {
    return null; // Don't show anything if no other traders are live
  }

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {liveTraders.map((trader, index) => {
        const yPos = calculateYPosition(trader.entry_price);
        const xPos = calculateXPosition(index, liveTraders.length);
        
        return (
          <div
            key={trader.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-all duration-500"
            style={{
              left: `${xPos}%`,
              top: `${yPos}%`,
            }}
          >
            <div className="relative group">
              {/* Trade indicator line */}
              <div 
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 w-0.5 h-8",
                  trader.trade_type === "buy" ? "bg-emerald-500" : "bg-red-500",
                  "top-full"
                )}
              />
              
              {/* Avatar with ring */}
              <div className={cn(
                "relative rounded-full p-0.5",
                trader.trade_type === "buy" 
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-600" 
                  : "bg-gradient-to-br from-red-400 to-red-600"
              )}>
                <Avatar className="w-8 h-8 border-2 border-[hsl(222,47%,11%)]">
                  <AvatarImage src={trader.avatar_url} alt={trader.display_name} />
                  <AvatarFallback className="text-xs bg-muted">
                    {trader.display_name?.charAt(0) || "T"}
                  </AvatarFallback>
                </Avatar>
                
                {/* Trade amount badge */}
                <div className={cn(
                  "absolute -bottom-1 -right-1 px-1 py-0.5 rounded text-[10px] font-bold text-white",
                  trader.trade_type === "buy" ? "bg-emerald-500" : "bg-red-500"
                )}>
                  ${trader.amount}
                </div>
              </div>
              
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-[hsl(222,47%,14%)] border border-border/50 rounded px-2 py-1 whitespace-nowrap">
                  <p className="text-xs font-medium">{trader.display_name}</p>
                  <p className={cn(
                    "text-xs",
                    trader.trade_type === "buy" ? "text-emerald-400" : "text-red-400"
                  )}>
                    {trader.trade_type.toUpperCase()} ${trader.amount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
