import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, Bot, BarChart3, Wallet, MessageCircle,
  Shield, GraduationCap, Bell, Users, X
} from "lucide-react";

const steps = [
  {
    icon: TrendingUp,
    title: "Welcome to Felans FX! 🎉",
    description: "Your all-in-one forex trading platform. Let's take a quick tour of the key features.",
    color: "from-primary to-primary/80",
  },
  {
    icon: BarChart3,
    title: "Live Trading",
    description: "Trade forex pairs in real-time with leverage up to 100x. Set stop-loss and take-profit to manage risk like a pro.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Bot,
    title: "AI Analysis & Trading Bot",
    description: "Upload chart screenshots for instant AI analysis, or subscribe to the AI Trading Bot that trades for you automatically.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Wallet,
    title: "Wallet & Security",
    description: "Deposit funds, withdraw earnings, and send money to other users. Set a 4-digit PIN to secure all your transactions.",
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: MessageCircle,
    title: "Chat Rooms & Games",
    description: "Join or create trading rooms, share signals, play Coin Flip & Jackpot games, and chat with the community.",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Users,
    title: "Social Feed",
    description: "Post trades, tag your history, upload media, like and comment. Show off your wins and learn from others!",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: GraduationCap,
    title: "School Hub & Guides",
    description: "Learn trading from scratch with Coach Alex. Access patterns, screenshot guides, and the full platform guide in your Profile.",
    color: "from-teal-500 to-cyan-600",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Get daily AI-powered morning briefs, midday opportunities, and evening recaps. Never miss a trading signal!",
    color: "from-yellow-500 to-amber-600",
  },
  {
    icon: Shield,
    title: "You're All Set! 🚀",
    description: "Start by funding your wallet or exploring the demo account. Visit 'How Felans FX Works' in Profile for the full guide. Happy trading!",
    color: "from-primary to-primary/80",
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const step = steps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-sm border-0 shadow-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header gradient */}
          <div className={`bg-gradient-to-br ${step.color} p-8 text-center relative`}>
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Icon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">{step.title}</h2>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {step.description}
            </p>

            {/* Progress */}
            <div className="space-y-2">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground text-center">
                {currentStep + 1} of {steps.length}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCurrentStep((s) => s - 1)}
                >
                  Back
                </Button>
              )}
              <Button
                className={`flex-1 gradient-primary`}
                onClick={handleNext}
              >
                {isLast ? "Get Started!" : "Next"}
              </Button>
            </div>

            {!isLast && (
              <button
                onClick={handleSkip}
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
              >
                Skip tour
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
