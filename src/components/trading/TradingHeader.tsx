import { ChevronDown, Menu, Wallet, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const currentBalance = accountType === "demo" ? demoBalance : realBalance;
  
  const formatBalance = (amount: number) => {
    if (accountType === "demo") {
      return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <header className="flex items-center justify-between gap-2 p-2.5 bg-gradient-to-b from-card to-card/80 backdrop-blur-xl border-b border-border/40 shadow-sm">
      {/* Menu + Bell */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/notifications")}
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-success text-[10px] font-bold text-success-foreground flex items-center justify-center">
            1
          </span>
        </Button>
      </div>


      {/* Balance Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-0 h-auto py-1 px-3 rounded-xl hover:bg-muted/30 flex-1 min-w-0"
          >
            <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {accountType === "demo" ? "Demo Account" : "Real Account"}
              <ChevronDown className="w-3 h-3" />
            </span>
            <span className={cn(
              "text-2xl font-extrabold tabular-nums leading-tight truncate max-w-full",
              accountType === "demo" ? "text-chart-2" : "text-success"
            )}>

              {formatBalance(currentBalance)}
            </span>
            <span className="text-[10px] text-muted-foreground">Available Balance</span>
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
        className="shrink-0 bg-info hover:bg-info/90 text-info-foreground font-semibold px-5 rounded-xl shadow-md shadow-info/20"
      >
        <Wallet className="w-4 h-4 mr-1.5" />
        Finances
      </Button>
    </header>
  );
};
