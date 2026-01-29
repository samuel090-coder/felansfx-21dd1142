import { ChevronDown, MessageSquare } from "lucide-react";
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

interface SymbolSelectorCompactProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

const SYMBOLS = {
  Forex: ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD"],
  Crypto: ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD", "ADAUSD"],
  Commodities: ["XAUUSD", "XAGUSD", "XTIUSD", "XBRUSD"],
};

const SYMBOL_ICONS: Record<string, string> = {
  BTCUSD: "₿",
  ETHUSD: "Ξ",
  XAUUSD: "🥇",
  XAGUSD: "🥈",
  EURUSD: "€/$",
  GBPUSD: "£/$",
  USDJPY: "$/¥",
};

export const SymbolSelectorCompact = ({
  selectedSymbol,
  onSymbolChange,
}: SymbolSelectorCompactProps) => {
  const getSymbolIcon = (symbol: string) => {
    return SYMBOL_ICONS[symbol] || symbol.substring(0, 3);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="bg-card border-border/50 text-foreground hover:bg-muted/30 gap-2"
          >
            <span className="text-lg">{getSymbolIcon(selectedSymbol)}</span>
            <span className="font-medium">{selectedSymbol}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-48 bg-card border-border/50 max-h-80 overflow-y-auto z-[100]"
        >
          {Object.entries(SYMBOLS).map(([category, symbols]) => (
            <div key={category}>
              <DropdownMenuLabel className="text-muted-foreground text-xs uppercase">
                {category}
              </DropdownMenuLabel>
              {symbols.map((symbol) => (
                <DropdownMenuItem
                  key={symbol}
                  onClick={() => onSymbolChange(symbol)}
                  className={cn(
                    "cursor-pointer text-foreground hover:bg-muted",
                    selectedSymbol === symbol && "bg-primary/20"
                  )}
                >
                  <span className="mr-2">{getSymbolIcon(symbol)}</span>
                  {symbol}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-border/50" />
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Chat button */}
      <Button
        variant="outline"
        size="icon"
        className="bg-card border-border/50 hover:bg-muted/30"
      >
        <MessageSquare className="w-4 h-4" />
      </Button>
    </div>
  );
};
