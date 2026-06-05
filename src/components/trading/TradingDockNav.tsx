import { Home, BarChart3, Copy, GraduationCap, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TradingDockNavProps {
  onCopyTrading?: () => void;
}

export const TradingDockNav = ({ onCopyTrading }: TradingDockNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { icon: Home, label: "Home", path: "/", onClick: () => navigate("/") },
    { icon: BarChart3, label: "Market", path: "/trading", onClick: () => navigate("/trading") },
    { icon: Copy, label: "Copy Trading", path: "__copy", onClick: () => onCopyTrading?.() },
    { icon: GraduationCap, label: "Academy", path: "/school", onClick: () => navigate("/school") },
    { icon: User, label: "Profile", path: "/profile", onClick: () => navigate("/profile") },
  ];

  return (
    <nav className="shrink-0 border-t border-border/40 bg-card/80 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {items.map(({ icon: Icon, label, path, onClick }) => {
          const isActive = path !== "__copy" && location.pathname === path;
          return (
            <button
              key={label}
              onClick={onClick}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-[10px] leading-none", isActive && "font-medium")}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
