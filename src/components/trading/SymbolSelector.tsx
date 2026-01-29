import { useState } from "react";
import { ChevronDown, Search, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { TickData } from "@/hooks/usePriceSimulation";

const TRADING_SYMBOLS = {
  "Forex Majors": ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD"],
  "Forex Crosses": ["EURGBP", "EURJPY", "GBPJPY"],
  "Crypto": ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD", "ADAUSD", "DOGEUSD", "DOTUSD", "LTCUSD", "LINKUSD"],
  "Commodities": ["XAUUSD", "XAGUSD", "XTIUSD", "XBRUSD"],
};

interface SymbolSelectorProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  prices: Record<string, TickData>;
}

export const SymbolSelector = ({ selectedSymbol, onSymbolChange, prices }: SymbolSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const currentPrice = prices[selectedSymbol];

  const filteredSymbols = Object.entries(TRADING_SYMBOLS).reduce((acc, [category, symbols]) => {
    const filtered = symbols.filter(s => 
      s.toLowerCase().includes(search.toLowerCase()) ||
      category.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, string[]>);

  const formatPrice = (symbol: string, price: number) => {
    if (symbol.includes("JPY")) return price.toFixed(3);
    if (["BTCUSD", "ETHUSD", "XAUUSD"].includes(symbol)) return price.toFixed(2);
    if (["XRPUSD", "DOGEUSD", "ADAUSD"].includes(symbol)) return price.toFixed(4);
    return price.toFixed(5);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="h-auto py-1.5 px-3 gap-2 justify-between min-w-[140px]">
          <div className="flex flex-col items-start">
            <span className="text-lg font-bold">{selectedSymbol}</span>
            {currentPrice && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{formatPrice(selectedSymbol, currentPrice.price)}</span>
                <span className={cn(
                  "text-xs flex items-center",
                  currentPrice.changePercent >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {currentPrice.changePercent >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {currentPrice.changePercent >= 0 ? "+" : ""}{currentPrice.changePercent.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle>Select Symbol</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search symbols..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="h-[calc(70vh-160px)]">
            <div className="space-y-4">
              {Object.entries(filteredSymbols).map(([category, symbols]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {symbols.map(symbol => {
                      const price = prices[symbol];
                      return (
                        <Button
                          key={symbol}
                          variant={selectedSymbol === symbol ? "secondary" : "ghost"}
                          className="h-auto py-2 px-3 justify-between"
                          onClick={() => {
                            onSymbolChange(symbol);
                            setOpen(false);
                          }}
                        >
                          <span className="font-medium">{symbol}</span>
                          {price && (
                            <div className="flex flex-col items-end">
                              <span className="text-xs">{formatPrice(symbol, price.price)}</span>
                              <span className={cn(
                                "text-[10px]",
                                price.changePercent >= 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {price.changePercent >= 0 ? "+" : ""}{price.changePercent.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
