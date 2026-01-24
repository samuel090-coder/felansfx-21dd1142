import { Copy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AnalysisCardProps {
  label: string;
  value: string;
  variant?: "bullish" | "bearish" | "neutral" | "entry" | "sl" | "tp" | "rr" | "default";
  icon?: React.ReactNode;
  copyable?: boolean;
  className?: string;
}

const variantStyles = {
  bullish: "bg-analysis-bullish text-analysis-bullish-text",
  bearish: "bg-analysis-bearish text-analysis-bearish-text",
  neutral: "bg-analysis-neutral text-analysis-neutral-text",
  entry: "bg-analysis-entry text-analysis-entry-text",
  sl: "bg-analysis-sl text-analysis-sl-text",
  tp: "bg-analysis-tp text-analysis-tp-text",
  rr: "bg-analysis-rr text-analysis-rr-text",
  default: "bg-card border border-border",
};

export const AnalysisCard = ({
  label,
  value,
  variant = "default",
  icon,
  copyable = true,
  className,
}: AnalysisCardProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  const getDefaultIcon = () => {
    switch (variant) {
      case "bullish":
        return <TrendingUp className="w-4 h-4" />;
      case "bearish":
        return <TrendingDown className="w-4 h-4" />;
      case "neutral":
        return <Minus className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl p-4 transition-all",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide opacity-80">
          {icon || getDefaultIcon()}
          {label}
        </div>
        {copyable && (
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-black/5 transition-colors opacity-60 hover:opacity-100"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
};
