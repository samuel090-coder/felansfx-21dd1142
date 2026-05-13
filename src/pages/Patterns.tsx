import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Category = "all" | "chart" | "candlestick" | "price-action";

interface Pattern {
  id: string;
  name: string;
  description: string;
  category: "chart" | "candlestick" | "price-action";
  highlighted?: boolean;
}

const patterns: Pattern[] = [
  {
    id: "1",
    name: "Head and Shoulders",
    description: "A reversal pattern that signals a change in trend direction.",
    category: "chart",
  },
  {
    id: "2",
    name: "Double Top / Bottom",
    description: "Indicates potential trend reversal after testing a level twice.",
    category: "chart",
  },
  {
    id: "3",
    name: "Liquidity Grab",
    description: "Price manipulation to trigger stop losses before moving.",
    category: "price-action",
  },
  {
    id: "4",
    name: "Bullish Engulfing",
    description: "A strong bullish signal where a green candle engulfs a red one.",
    category: "candlestick",
    highlighted: true,
  },
  {
    id: "5",
    name: "Bearish Pin Bar",
    description: "A price rejection pattern often forming near resistance.",
    category: "candlestick",
  },
  {
    id: "6",
    name: "Morning Star",
    description: "A three-candle bullish reversal pattern at market bottoms.",
    category: "candlestick",
  },
  {
    id: "7",
    name: "Triangle Patterns",
    description: "Continuation patterns showing consolidation before breakout.",
    category: "chart",
  },
  {
    id: "8",
    name: "Order Block",
    description: "Institutional supply/demand zones where smart money enters.",
    category: "price-action",
  },
];

const Patterns = () => {
  const [category, setCategory] = useState<Category>("all");

  const filteredPatterns = patterns.filter(
    (p) => category === "all" || p.category === category
  );

  return (
    <AppLayout>
      <Seo
        title="Chart Patterns Learning Hub — Felans FX"
        description="Learn classic chart, candlestick and price-action patterns used by professional forex and crypto traders."
        path="/patterns"
      />
      <Header title="Patterns" showBack />

      <div className="px-4 py-4">
        <div className="mb-6">
          <h2 className="text-xl font-display font-bold mb-1">Explore Patterns</h2>
          <p className="text-sm text-muted-foreground">Pattern Playbook</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tactical breakdown of price action setups and candlestick formations.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: "all", label: "All" },
            { value: "chart", label: "Chart Patterns" },
            { value: "candlestick", label: "Candlestick Patterns" },
            { value: "price-action", label: "Price Action" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCategory(tab.value as Category)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                category === tab.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Patterns List */}
        <div className="space-y-3">
          {filteredPatterns.map((pattern) => (
            <Card
              key={pattern.id}
              className={cn(
                "border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow",
                pattern.highlighted && "bg-analysis-rr"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{pattern.name}</h3>
                    <p className="text-sm text-muted-foreground">{pattern.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Patterns;
