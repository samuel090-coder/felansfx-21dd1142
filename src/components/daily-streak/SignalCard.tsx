 import { TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { cn } from "@/lib/utils";
 
 interface SignalCardProps {
   symbol: string;
   tradeType: string;
   entryPrice: string;
   stopLoss: string;
   takeProfit: string;
   riskReward?: string;
   status: string;
   notes?: string;
   isActive: boolean;
 }
 
 export const SignalCard = ({
   symbol,
   tradeType,
   entryPrice,
   stopLoss,
   takeProfit,
   riskReward,
   status,
   notes,
   isActive,
 }: SignalCardProps) => {
   const isBuy = tradeType.toLowerCase() === "buy";
   const statusColors = {
     active: "bg-blue-500/10 text-blue-600 border-blue-500/20",
     "hit_tp": "bg-green-500/10 text-green-600 border-green-500/20",
     "hit_sl": "bg-red-500/10 text-red-600 border-red-500/20",
     pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
   };
 
   return (
     <Card className={cn(
       "overflow-hidden transition-all hover:shadow-lg border-2",
       !isActive && "opacity-60"
     )}>
       <CardHeader className={cn(
         "pb-3",
         isBuy ? "bg-gradient-to-br from-green-500/10 to-green-600/5" : "bg-gradient-to-br from-red-500/10 to-red-600/5"
       )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn(
              "shrink-0 p-2.5 rounded-xl",
              isBuy ? "bg-green-500 text-white" : "bg-red-500 text-white"
            )}>
              {isBuy ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-xl font-bold">{symbol}</CardTitle>
              <p className={cn(
                "text-sm font-semibold mt-0.5",
                isBuy ? "text-green-600" : "text-red-600"
              )}>
                {tradeType.toUpperCase()}
              </p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn("shrink-0 whitespace-nowrap font-semibold border-2", statusColors[status as keyof typeof statusColors] || statusColors.pending)}
          >
            {status.replace("_", " ").toUpperCase()}
          </Badge>
        </div>
       </CardHeader>
 
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0 bg-primary/5 rounded-lg p-3 border border-primary/10">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <Target className="w-3.5 h-3.5 shrink-0" />
              ENTRY
            </div>
            <p className="truncate text-base font-bold text-primary tabular-nums">{entryPrice}</p>
          </div>
          
          <div className="min-w-0 bg-red-500/5 rounded-lg p-3 border border-red-500/10">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              STOP LOSS
            </div>
            <p className="truncate text-base font-bold text-red-600 tabular-nums">{stopLoss}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0 bg-green-500/5 rounded-lg p-3 border border-green-500/10">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              TAKE PROFIT
            </div>
            <p className="truncate text-base font-bold text-green-600 tabular-nums">{takeProfit}</p>
          </div>
          
          {riskReward && (
            <div className="min-w-0 bg-blue-500/5 rounded-lg p-3 border border-blue-500/10">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                RISK:REWARD
              </div>
              <p className="truncate text-base font-bold text-blue-600 tabular-nums">{riskReward}</p>
            </div>
          )}
        </div>
 
         {notes && (
           <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
             <p className="text-sm text-muted-foreground leading-relaxed">{notes}</p>
           </div>
         )}
       </CardContent>
     </Card>
   );
 };