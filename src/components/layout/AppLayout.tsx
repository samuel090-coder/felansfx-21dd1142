import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  className?: string;
}

export const AppLayout = ({ children, hideNav = false, className }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <main
        className={cn(
          "max-w-md mx-auto",
          !hideNav && "pb-28",
          className
        )}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
};
