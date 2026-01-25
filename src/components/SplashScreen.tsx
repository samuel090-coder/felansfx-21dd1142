import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export const SplashScreen = ({ onComplete, minDuration = 2000 }: SplashScreenProps) => {
  const [isAnimating, setIsAnimating] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 500);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary to-accent transition-opacity duration-500 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Logo Container */}
      <div
        className={`flex flex-col items-center transition-all duration-700 ${
          isAnimating ? "animate-bounce-slow" : ""
        }`}
      >
        {/* Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
            <TrendingUp className="w-12 h-12 text-white animate-pulse" />
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 w-24 h-24 rounded-3xl bg-white/30 blur-xl -z-10" />
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">
          Felans FX
        </h1>
        <p className="text-white/80 text-sm font-medium">
          Professional Trade Analysis
        </p>
      </div>

      {/* Loading indicator */}
      <div className="absolute bottom-20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>

      {/* Version */}
      <p className="absolute bottom-6 text-white/50 text-xs">
        Version 1.0.0
      </p>
    </div>
  );
};
