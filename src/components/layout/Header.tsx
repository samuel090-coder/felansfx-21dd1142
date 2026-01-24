import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  className?: string;
  rightElement?: React.ReactNode;
}

export const Header = ({ title, showBack = false, className, rightElement }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 glass-effect border-b border-border safe-area-top",
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
        <div className="flex items-center gap-2 flex-1">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9 -ml-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="font-display font-semibold text-lg truncate">{title}</h1>
        </div>
        {rightElement && <div className="flex-shrink-0">{rightElement}</div>}
      </div>
    </header>
  );
};
