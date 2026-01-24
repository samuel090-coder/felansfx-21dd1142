import { Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StartAnalysisButtonProps {
  className?: string;
}

export const StartAnalysisButton = ({ className }: StartAnalysisButtonProps) => {
  return (
    <Link
      to="/analyze"
      className={cn(
        "inline-flex flex-col items-center justify-center w-20 h-20 rounded-full gradient-primary shadow-primary transition-all hover:scale-105 active:scale-95",
        className
      )}
    >
      <Bot className="w-6 h-6 text-white mb-1" />
      <span className="text-white text-xs font-medium">Start Analysis</span>
    </Link>
  );
};
