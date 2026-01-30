import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Menu, 
  TrendingUp, 
  Wallet, 
  Trophy, 
  Gift, 
  User, 
  GraduationCap, 
  Lightbulb, 
  HelpCircle,
  Settings,
  LogOut,
  Bell,
  ArrowDownToLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useNotifications } from "@/hooks/useNotifications";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  highlight?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: TrendingUp, label: "Trade", path: "/trading" },
  { icon: Wallet, label: "Finances", path: "/deposit" },
  { icon: ArrowDownToLine, label: "Withdraw", path: "/withdraw" },
  { icon: Trophy, label: "Battles", path: "/daily-streak" },
  { icon: Gift, label: "Invite Friends\nand Earn Money", path: "/invite", highlight: true },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: GraduationCap, label: "Education", path: "/patterns" },
  { icon: Lightbulb, label: "Start Tips", path: "/screenshot-guide" },
  { icon: HelpCircle, label: "Help", path: "/help" },
];

export const MainMenuDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { wallet } = useWallet();
  const { unreadCount } = useNotifications();
  const [profile, setProfile] = useState<{ full_name: string | null; display_id: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, display_id, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    navigate("/auth");
  };

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const displayId = profile?.display_id || "NEWBIE";

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
        >
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85%] max-w-xs p-0 flex flex-col">
        {/* Header with User Info */}
        <div className="p-4 pb-6 border-b border-border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={userName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(wallet?.balance || 0, "NGN")}
                </p>
                <p className="font-medium text-foreground">{userName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-muted rounded font-medium">
                    {displayId}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> 0
                  </span>
                </div>
              </div>
            </div>
            {/* Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => handleNavigation("/notifications")}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors",
                  isActive ? "bg-muted text-primary" : "text-foreground hover:bg-muted/50",
                  item.highlight && "text-amber-500"
                )}
              >
                <item.icon className={cn("w-5 h-5", item.highlight && "text-amber-500")} />
                <span className={cn(
                  "text-sm font-medium whitespace-pre-line",
                  item.highlight && "text-amber-500"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border p-2">
          <div className="flex">
            <button
              onClick={() => handleNavigation("/profile")}
              className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs">Settings</span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-xs">Exit</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
