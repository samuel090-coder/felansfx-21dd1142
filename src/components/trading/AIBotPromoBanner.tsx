import { Bot, Sparkles, TrendingUp, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AIBotPromoBannerProps {
  open: boolean;
  onBuy: () => void;
  onCancel: () => void;
}

export const AIBotPromoBanner = ({ open, onBuy, onCancel }: AIBotPromoBannerProps) => {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-sm rounded-3xl border-primary/40 p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 px-5 pt-6 pb-4 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center mb-3">
            <Bot className="w-9 h-9 text-primary" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-500" /> Trade with AI
            </DialogTitle>
            <DialogDescription className="text-sm mt-1">
              New to trading? Let our AI bot do it for you.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Many traders lose money guessing the market. Our AI bot is built for
            people <b>without trading experience</b> — once you buy it, the AI
            <b> trades automatically for you</b>. You only set your stake; the bot
            handles every entry and exit in real time.
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Fully automatic — no manual setup
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-primary" /> Watch trades happen live on your chart
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-amber-500" /> Pause or stop the bot anytime
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button className="w-full gradient-primary font-bold h-12" onClick={onBuy}>
              <Bot className="w-4 h-4 mr-1" /> Buy AI Bot
            </Button>
            <Button variant="ghost" className="w-full h-10 text-muted-foreground" onClick={onCancel}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
