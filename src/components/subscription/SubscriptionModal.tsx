import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Star, ArrowRight, BookOpen, Zap, Calendar, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string | null;
  is_featured: boolean;
  discount_text: string | null;
}

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const benefits = [
  { icon: ArrowRight, text: "Curated Daily analysis directly from us" },
  { icon: Zap, text: "Generate Expert refined trade analysis." },
  { icon: Calendar, text: "Calendar News and AI news implications." },
  { icon: BookOpen, text: "Easiest learning resources on chart patterns" },
];

export const SubscriptionModal = ({ open, onOpenChange }: SubscriptionModalProps) => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      setPlans(data || []);
      if (data && data.length > 0) {
        const featured = data.find(p => p.is_featured);
        setSelectedPlan(featured?.id || data[0].id);
      }
      setLoading(false);
    };
    if (open) fetchPlans();
  }, [open]);

  const handleSubscribe = () => {
    onOpenChange(false);
    navigate("/deposit");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-slate-950 border-0 text-white overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Subscribe to Premium</DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <button onClick={() => onOpenChange(false)}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
          <span className="text-sm text-slate-400">Restore</span>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-center mb-6">
            Claim back your time now
          </h2>

          {/* Benefits */}
          <div className="space-y-4 mb-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-3">
                <benefit.icon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Stars and testimonial */}
          <div className="text-center mb-6">
            <div className="flex justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm text-slate-400 italic">
              "This is the best tool I've come across. I'm working most times, so it helps that I can just do an analysis and place trades on the go!"
            </p>
            <p className="text-xs text-slate-500 mt-1">- Sarah John</p>
          </div>

          {/* Plans */}
          <div className="space-y-3 mb-6">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all",
                  selectedPlan === plan.id
                    ? "border-primary bg-primary/10"
                    : "border-slate-700 bg-slate-900"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{plan.name}</p>
                    {plan.discount_text && (
                      <p className="text-xs text-primary">{plan.discount_text}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{formatCurrency(plan.price, "NGN")}</span>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      selectedPlan === plan.id ? "border-primary bg-primary" : "border-slate-600"
                    )}>
                      {selectedPlan === plan.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Subscribe button */}
          <Button
            onClick={handleSubscribe}
            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-900"
          >
            Subscribe
          </Button>

          <p className="text-center text-xs text-slate-500 mt-3">
            Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
