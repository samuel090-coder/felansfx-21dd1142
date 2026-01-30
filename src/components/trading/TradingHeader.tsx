import { useState } from "react";
import { ChevronDown, Menu, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TradingHeaderProps {
  demoBalance: number;
  realBalance: number;
  accountType: "demo" | "real";
  onAccountChange: (type: "demo" | "real") => void;
  onFinancesClick: () => void;
}

export const TradingHeader = ({
  demoBalance,
  realBalance,
  accountType,
  onAccountChange,
  onFinancesClick,
}: TradingHeaderProps) => {
  const currentBalance = accountType === "demo" ? demoBalance : realBalance;
  
  const formatBalance = (amount: number) => {
    if (accountType === "demo") {
      return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <header className="flex items-center justify-between p-2 bg-card border-b border-border/30">
      {/* Menu Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative text-muted-foreground hover:text-foreground"
      >
        <Menu className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
          1
        </span>
      </Button>

      {/* Balance Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex flex-col items-center gap-0 h-auto py-1 px-4 hover:bg-muted/20"
          >
            <span className={cn(
              "text-xl font-bold tabular-nums",
              accountType === "demo" ? "text-chart-2" : "text-primary"
            )}>
              {formatBalance(currentBalance)}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {accountType === "demo" ? "Demo Balance" : "Real Account"}
              <ChevronDown className="w-3 h-3" />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56 bg-card border-border/50 z-[100]">
          <DropdownMenuItem 
            onClick={() => onAccountChange("demo")}
            className={cn(
              "flex justify-between cursor-pointer",
              accountType === "demo" && "bg-muted/30"
            )}
          >
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-chart-2" />
              Demo Account
            </span>
            <span className="text-chart-2 font-medium">
              ${demoBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onAccountChange("real")}
            className={cn(
              "flex justify-between cursor-pointer",
              accountType === "real" && "bg-muted/30"
            )}
          >
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Real Account
            </span>
            <span className="text-primary font-medium">
              ₦{realBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Finances Button */}
      <Button 
        onClick={onFinancesClick}
        className="bg-info hover:bg-info/90 text-info-foreground font-semibold px-6"
      >
        Finances
      </Button>

      {/* Settings Menu */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="text-muted-foreground hover:text-foreground"
      >
        <Menu className="w-5 h-5" />
      </Button>
    </header>
  );
};
