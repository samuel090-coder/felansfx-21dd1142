import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";
import { useBackgroundImage } from "@/hooks/useBackgroundImage";

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  className?: string;
}

export const AppLayout = ({ children, hideNav = false, className }: AppLayoutProps) => {
  const { bgUrl } = useBackgroundImage();
  const isGradient = bgUrl?.startsWith("linear-gradient");

  return (
    <div
      className="min-h-screen bg-background"
      style={bgUrl ? (isGradient ? {
        background: bgUrl,
        backgroundAttachment: "fixed",
      } : {
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }) : undefined}
    >
      {bgUrl && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm pointer-events-none z-0" />
      )}
      <main
        className={cn(
          "max-w-md mx-auto relative z-10",
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
