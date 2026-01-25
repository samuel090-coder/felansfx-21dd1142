import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const TRADING_SYMBOLS = {
  "Forex Majors": [
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "USDCHF",
    "AUDUSD",
    "USDCAD",
    "NZDUSD",
  ],
  "Forex Crosses": [
    "EURGBP",
    "EURJPY",
    "GBPJPY",
    "AUDJPY",
    "CADJPY",
    "EURAUD",
    "EURNZD",
    "GBPAUD",
    "GBPNZD",
    "AUDNZD",
    "AUDCAD",
  ],
  "Commodities": [
    "XAUUSD",
    "XAGUSD",
    "XAUEUR",
    "XTIUSD",
    "XBRUSD",
    "XNGUSD",
  ],
  "Crypto": [
    "BTCUSD",
    "ETHUSD",
    "BNBUSD",
    "XRPUSD",
    "SOLUSD",
    "ADAUSD",
    "DOGEUSD",
    "DOTUSD",
    "LTCUSD",
    "LINKUSD",
  ],
  "Indices": [
    "US30",
    "US100",
    "US500",
    "UK100",
    "GER40",
    "JPN225",
    "AUS200",
    "FRA40",
  ],
};

interface SymbolSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function SymbolSelect({
  value,
  onValueChange,
  placeholder = "Select instrument...",
}: SymbolSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allSymbols = useMemo(() => {
    return Object.entries(TRADING_SYMBOLS).flatMap(([category, symbols]) =>
      symbols.map((symbol) => ({ symbol, category }))
    );
  }, []);

  const filteredSymbols = useMemo(() => {
    if (!searchQuery) return allSymbols;
    const query = searchQuery.toUpperCase();
    return allSymbols.filter(
      ({ symbol, category }) =>
        symbol.includes(query) || category.toUpperCase().includes(query)
    );
  }, [allSymbols, searchQuery]);

  const groupedFiltered = useMemo(() => {
    const groups: Record<string, string[]> = {};
    filteredSymbols.forEach(({ symbol, category }) => {
      if (!groups[category]) groups[category] = [];
      groups[category].push(symbol);
    });
    return groups;
  }, [filteredSymbols]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11 text-left font-normal"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search symbols..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-64">
            <CommandEmpty>No symbol found.</CommandEmpty>
            {Object.entries(groupedFiltered).map(([category, symbols]) => (
              <CommandGroup key={category} heading={category}>
                {symbols.map((symbol) => (
                  <CommandItem
                    key={symbol}
                    value={symbol}
                    onSelect={() => {
                      onValueChange(symbol);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === symbol ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {symbol}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
