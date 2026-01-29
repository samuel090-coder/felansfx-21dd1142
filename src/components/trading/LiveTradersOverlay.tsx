import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface LiveTrade {
  id: string;
  user_id: string;
  symbol: string;
  trade_type: "buy" | "sell";
  amount: number;
  entry_price: number;
  avatar_url?: string;
  display_name?: string;
  x_position: number; // percentage across chart
  y_position: number; // percentage down chart
}

interface LiveTradersOverlayProps {
  symbol: string;
  currentPrice: number;
  priceRange: { min: number; max: number };
  className?: string;
}

// Generate mock live traders for demo purposes
const generateMockTraders = (symbol: string, currentPrice: number): LiveTrade[] => {
  const traders: LiveTrade[] = [];
  const names = ["Alex", "Maria", "John", "Sarah", "Mike", "Emma", "David", "Lisa", "Tom", "Anna"];
  const avatars = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Tom",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna",
  ];
  
  const numTraders = Math.floor(Math.random() * 6) + 4; // 4-10 traders
  
  for (let i = 0; i < numTraders; i++) {
    const priceOffset = (Math.random() - 0.5) * currentPrice * 0.01;
    traders.push({
      id: `mock-${i}`,
      user_id: `user-${i}`,
      symbol,
      trade_type: Math.random() > 0.5 ? "buy" : "sell",
      amount: Math.floor(Math.random() * 200) + 10,
      entry_price: currentPrice + priceOffset,
      avatar_url: avatars[i % avatars.length],
      display_name: names[i % names.length],
      x_position: Math.random() * 80 + 10, // 10-90%
      y_position: Math.random() * 60 + 20, // 20-80%
    });
  }
  
  return traders;
};

export const LiveTradersOverlay = ({ 
  symbol, 
  currentPrice, 
  priceRange,
  className 
}: LiveTradersOverlayProps) => {
  const [liveTraders, setLiveTraders] = useState<LiveTrade[]>([]);
  const [presenceState, setPresenceState] = useState<Record<string, any>>({});

  // Initialize with mock traders and update periodically
  useEffect(() => {
    const traders = generateMockTraders(symbol, currentPrice);
    setLiveTraders(traders);

    // Update mock traders every 3-5 seconds for realistic feel
    const interval = setInterval(() => {
      setLiveTraders(prevTraders => {
        // Randomly update positions slightly
        return prevTraders.map(trader => ({
          ...trader,
          x_position: Math.max(5, Math.min(95, trader.x_position + (Math.random() - 0.5) * 2)),
          y_position: Math.max(10, Math.min(90, trader.y_position + (Math.random() - 0.5) * 3)),
        }));
      });

      // Occasionally add/remove traders
      if (Math.random() > 0.7) {
        setLiveTraders(generateMockTraders(symbol, currentPrice));
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [symbol, currentPrice]);

  // Subscribe to real-time presence for actual live users
  useEffect(() => {
    const channel = supabase.channel(`trading-room-${symbol}`);
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPresenceState(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Trader joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Trader left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            symbol,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbol]);

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {liveTraders.map((trader) => (
        <div
          key={trader.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          style={{
            left: `${trader.x_position}%`,
            top: `${trader.y_position}%`,
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
                  {trader.display_name?.charAt(0) || "U"}
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
      ))}
    </div>
  );
};
