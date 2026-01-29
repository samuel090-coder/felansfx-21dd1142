import { useState } from "react";
import { Share2, Copy, Gift, Users, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Invite = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  
  const referralCode = user?.id?.slice(0, 8).toUpperCase() || "SHARE123";
  const referralLink = `https://felansfx.lovable.app?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join FelansFX Trading",
          text: "Start trading smarter with AI-powered chart analysis. Join me on FelansFX!",
          url: referralLink,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <AppLayout>
      <Header title="Invite Friends" showBack />
      <div className="px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Invite Friends, Earn Rewards</h2>
          <p className="text-muted-foreground">
            Share your referral link and earn bonuses when your friends sign up and trade.
          </p>
        </div>

        {/* Referral Link Card */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-2">Your Referral Link</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono truncate">
                {referralLink}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Share Button */}
        <Button
          onClick={handleShare}
          className="w-full gradient-primary h-12"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share Invite Link
        </Button>

        {/* Stats */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-medium">Your Referrals</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Friends Invited</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">$0</p>
                <p className="text-xs text-muted-foreground">Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <div>
          <h3 className="font-semibold mb-3">How It Works</h3>
          <div className="space-y-3">
            {[
              { step: 1, text: "Share your unique referral link with friends" },
              { step: 2, text: "Friends sign up using your link" },
              { step: 3, text: "Earn bonus when they make their first deposit" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {step}
                </div>
                <p className="text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Invite;
