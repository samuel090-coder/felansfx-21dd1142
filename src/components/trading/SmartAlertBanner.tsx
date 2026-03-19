import { useNavigate } from "react-router-dom";
import { AlertTriangle, BookOpen, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AlertType } from "@/hooks/useSmartAlerts";

interface SmartAlertBannerProps {
  type: AlertType;
  title: string;
  message: string;
  action: string;
  actionRoute: string;
  severity: "info" | "warning" | "danger";
  onDismiss: () => void;
  onSwitchDemo?: () => void;
}

export const SmartAlertBanner = ({
  type, title, message, action, actionRoute, severity, onDismiss, onSwitchDemo,
}: SmartAlertBannerProps) => {
  const navigate = useNavigate();

  const handleAction = () => {
    if (type === "switch_demo" || (type === "losing_streak" && !actionRoute)) {
      onSwitchDemo?.();
    } else if (actionRoute) {
      navigate(actionRoute);
    }
    onDismiss();
  };

  return (
    <div className={cn(
      "mx-2 mb-2 rounded-xl p-3 animate-in slide-in-from-top-2 duration-300 border",
      severity === "danger" && "bg-destructive/10 border-destructive/30",
      severity === "warning" && "bg-amber-500/10 border-amber-500/30",
      severity === "info" && "bg-primary/10 border-primary/30",
    )}>
      <div className="flex items-start gap-2">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          severity === "danger" && "bg-destructive/20",
          severity === "warning" && "bg-amber-500/20",
          severity === "info" && "bg-primary/20",
        )}>
          {severity === "danger" ? <Shield className="w-4 h-4 text-destructive" /> :
           severity === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
           <BookOpen className="w-4 h-4 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-bold",
            severity === "danger" && "text-destructive",
            severity === "warning" && "text-amber-600 dark:text-amber-400",
            severity === "info" && "text-primary",
          )}>{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 h-7 text-xs"
            onClick={handleAction}
          >
            {action}
          </Button>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
