import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FintechShellProps {
  children: ReactNode;
  className?: string;
}

export const FintechShell = ({ children, className }: FintechShellProps) => {
  return (
    <div className={cn("min-h-screen bg-fx-app text-foreground", className)}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-4 safe-area-top">
        {children}
      </div>
    </div>
  );
};

interface FintechCardProps {
  children: ReactNode;
  className?: string;
}

export const FintechCard = ({ children, className }: FintechCardProps) => {
  return <div className={cn("fx-card", className)}>{children}</div>;
};

interface FintechSectionHeaderProps {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

export const FintechSectionHeader = ({ title, eyebrow, action, className }: FintechSectionHeaderProps) => {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <div>
        {eyebrow ? <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p> : null}
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};

interface FintechStatPillProps {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
  className?: string;
}

export const FintechStatPill = ({ label, value, tone = "default", className }: FintechStatPillProps) => {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2",
        tone === "success" && "border-primary/30 bg-primary/10",
        tone === "danger" && "border-destructive/30 bg-destructive/10",
        tone === "default" && "border-white/10 bg-white/5",
        className,
      )}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-base font-semibold tabular-nums text-foreground",
          tone === "success" && "text-primary",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
};
