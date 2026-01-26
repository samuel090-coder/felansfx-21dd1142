 import { Calendar, AlertCircle, TrendingUp } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { cn } from "@/lib/utils";
 import { format } from "date-fns";
 
 interface NewsCardProps {
   title: string;
   content: string;
   newsType: string;
   importance?: string;
   publishedAt: string;
   source?: string;
 }
 
 export const NewsCard = ({
   title,
   content,
   newsType,
   importance = "medium",
   publishedAt,
   source,
 }: NewsCardProps) => {
   const importanceColors = {
     high: "bg-red-500/10 text-red-600 border-red-500/20",
     medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
     low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
   };
 
   const typeIcons = {
     news: <TrendingUp className="w-4 h-4" />,
     calendar: <Calendar className="w-4 h-4" />,
     alert: <AlertCircle className="w-4 h-4" />,
   };
 
   const typeColors = {
     news: "from-blue-500/10 to-blue-600/5",
     calendar: "from-purple-500/10 to-purple-600/5",
     alert: "from-orange-500/10 to-orange-600/5",
   };
 
   return (
     <Card className="overflow-hidden transition-all hover:shadow-lg border-2 border-border/50 hover:border-primary/20">
       <CardHeader className={cn(
         "pb-3 bg-gradient-to-br",
         typeColors[newsType as keyof typeof typeColors] || typeColors.news
       )}>
         <div className="flex items-start justify-between gap-3">
           <div className="flex-1">
             <div className="flex items-center gap-2 mb-2">
               <div className="p-1.5 rounded-lg bg-primary/10">
                 {typeIcons[newsType as keyof typeof typeIcons] || typeIcons.news}
               </div>
               <Badge variant="outline" className="text-xs">
                 {newsType.toUpperCase()}
               </Badge>
             </div>
             <CardTitle className="text-xl font-bold leading-tight">{title}</CardTitle>
           </div>
           <Badge 
             variant="outline" 
             className={cn("font-semibold border-2 shrink-0", importanceColors[importance as keyof typeof importanceColors])}
           >
             {importance.toUpperCase()}
           </Badge>
         </div>
       </CardHeader>
 
       <CardContent className="pt-4">
         <p className="text-sm text-muted-foreground leading-relaxed mb-4">
           {content}
         </p>
         
         <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
           <div className="flex items-center gap-2">
             <Calendar className="w-3.5 h-3.5" />
             <span>{format(new Date(publishedAt), "MMM dd, yyyy 'at' h:mm a")}</span>
           </div>
           {source && (
             <span className="font-medium">{source}</span>
           )}
         </div>
       </CardContent>
     </Card>
   );
 };