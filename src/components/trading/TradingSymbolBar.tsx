import { useState } from "react";
import { ChevronDown, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getSymbolMeta, SYMBOL_GROUPS } from "@/lib/symbolMeta";

interface TradingSymbolBarProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  changePercent?: number;
  closes?: number[];
  onChat?: () => void;
}

/** Tiny inline sparkline for the 24h change card. */
const Sparkline = ({ closes, up }: { closes: number[]; up: boolean }) => {
  if (!closes || closes.length < 2) {
    return <div className="w-full h-full" />;
  }
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 100;
  const h = 32;
  const step = w / (closes.length - 1);
  const points = closes
    .map((c, i) => `${(i * step).toFixed(1)},${(h - ((c - min) / range) * h).toFixed(1)}`)
    .join(" ");
  const color = up ? "hsl(var(--success))" : "hsl(var(--destructive))";
  const id = up ? "spark-up" : "spark-down";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

export const TradingSymbolBar = ({
  selectedSymbol,
  onSymbolChange,
  changePercent = 0,
  closes = [],
  onChat,
}: TradingSymbolBarProps) => {
  const [favorites, setFavorites] = useState<string[]>(["XAUUSD"]);
  const meta = getSymbolMeta(selectedSymbol);
  const isFav = favorites.includes(selectedSymbol);
  const up = changePercent >= 0;

  const toggleFav = () =>
    setFavorites((prev) =>
      prev.includes(selectedSymbol)
        ? prev.filter((s) => s !== selectedSymbol)
        : [...prev, selectedSymbol]
    );

  return (
    <div className="flex items-stretch gap-2 px-3 py-2">
      {/* Symbol selector card */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex-1 flex items-center gap-2.5 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md px-3 py-2 text-left hover:bg-muted/40 transition-colors min-w-0">
            <span className="text-2xl leading-none shrink-0">{meta.icon}</span>
            <span className="flex flex-col min-w-0">
              <span className="flex items-center gap-1 font-bold text-foreground text-base leading-tight">
                <span className="truncate">{selectedSymbol}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </span>
              <span className="text-[11px] text-muted-foreground truncate">{meta.name}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 bg-card border-border/50 max-h-80 overflow-y-auto z-[100]"
        >
          {Object.entries(SYMBOL_GROUPS).map(([category, symbols]) => (
            <div key={category}>
              <DropdownMenuLabel className="text-muted-foreground text-xs uppercase">
                {category}
              </DropdownMenuLabel>
              {symbols.map((symbol) => {
                const m = getSymbolMeta(symbol);
                return (
                  <DropdownMenuItem
                    key={symbol}
                    onClick={() => onSymbolChange(symbol)}
                    className={cn(
                      "cursor-pointer text-foreground hover:bg-muted gap-2",
                      selectedSymbol === symbol && "bg-primary/20"
                    )}
                  >
                    <span>{m.icon}</span>
                    <span className="font-medium">{symbol}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground truncate max-w-[90px]">
                      {m.name}
                    </span>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator className="bg-border/50" />
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Favorite */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleFav}
        className="h-auto w-11 rounded-2xl bg-card/60 border-border/40 hover:bg-muted/40 shrink-0"
      >
        <Star
          className={cn(
            "w-5 h-5",
            isFav ? "fill-warning text-warning" : "text-muted-foreground"
          )}
        />
      </Button>

      {/* Chat */}
      <Button
        variant="outline"
        size="icon"
        onClick={onChat}
        className="h-auto w-11 rounded-2xl bg-card/60 border-border/40 hover:bg-muted/40 shrink-0"
      >
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
      </Button>

      {/* 24h change card */}
      <div className="w-[110px] shrink-0 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md px-2.5 py-1.5 flex flex-col justify-between overflow-hidden">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground leading-tight">24h Change</span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums leading-tight",
              up ? "text-success" : "text-destructive"
            )}
          >
            {up ? "+" : ""}
            {changePercent.toFixed(2)}%
          </span>
        </div>
        <div className="h-4 -mx-0.5">
          <Sparkline closes={closes} up={up} />
        </div>
      </div>
    </div>
  );
};
