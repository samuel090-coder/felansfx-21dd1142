import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Wallet, Loader2, ShieldCheck, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { startPaystackPayment } from "@/lib/paystack";

interface DepositFlowProps {
  userId: string;
  onComplete: (message: string) => void;
  onCancel: () => void;
}

const DEPOSIT_AMOUNTS = [
  { value: 5000, label: "₦5,000" },
  { value: 10000, label: "₦10,000" },
  { value: 20000, label: "₦20,000" },
  { value: 50000, label: "₦50,000" },
  { value: 100000, label: "₦100,000" },
];

export const DepositFlow = ({ onComplete, onCancel }: DepositFlowProps) => {
  const { toast } = useToast();
  const [customAmount, setCustomAmount] = useState("");
  const [paying, setPaying] = useState(false);

  const pay = async (amount: number) => {
    if (isNaN(amount) || amount < 1000) {
      toast({
        title: "Invalid amount",
        description: "Please enter at least ₦1,000",
        variant: "destructive",
      });
      return;
    }
    setPaying(true);
    try {
      const result = await startPaystackPayment({ purpose: "deposit", amount });
      if (result.status === "success") {
        onComplete(
          `Payment successful! 🎉 Your wallet has been credited with ${formatCurrency(amount, "NGN")}.\n\n` +
          `Ready to keep learning? I've got some great lessons lined up for you! 📚`
        );
      } else if (result.status === "pending") {
        onComplete(
          `Payment received! ⏳ Your ${formatCurrency(amount, "NGN")} deposit is being confirmed and your ` +
          `wallet will update shortly. Let's continue learning in the meantime! 📚`
        );
      } else if (result.status === "error") {
        toast({ title: "Payment failed", description: result.message, variant: "destructive" });
      }
    } finally {
      setPaying(false);
    }
  };

  if (paying) {
    return (
      <Card className="p-6 bg-muted/50 border-primary/20">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Opening secure Paystack checkout…</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-muted/50 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Wallet className="w-5 h-5" />
          <span className="font-medium">How much would you like to deposit? 💰</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {DEPOSIT_AMOUNTS.map((amt) => (
            <Button key={amt.value} variant="outline" className="h-12" onClick={() => pay(amt.value)}>
              {amt.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Custom amount (min ₦1,000)"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="flex-1"
          />
          <Button onClick={() => pay(parseFloat(customAmount))} disabled={!customAmount}>
            Go
          </Button>
        </div>

        <div className="space-y-1.5 rounded-lg bg-background/50 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-primary" /> Instant wallet credit after payment</div>
          <div className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Secure checkout powered by Paystack</div>
        </div>

        <Button variant="ghost" size="sm" onClick={onCancel} className="w-full">
          Maybe later
        </Button>
      </div>
    </Card>
  );
};
