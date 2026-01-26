 import { BookOpen, PlayCircle, FileText } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { cn } from "@/lib/utils";
 
 interface GuideCardProps {
   title: string;
   content: string;
   contentType: string;
   videoUrl?: string;
 }
 
 export const GuideCard = ({
   title,
   content,
   contentType,
   videoUrl,
 }: GuideCardProps) => {
   const hasVideo = videoUrl && videoUrl.trim().length > 0;
   
   const getVideoEmbedUrl = (url: string) => {
     // YouTube
     if (url.includes("youtube.com") || url.includes("youtu.be")) {
       const videoId = url.includes("youtu.be") 
         ? url.split("youtu.be/")[1]?.split("?")[0]
         : url.split("v=")[1]?.split("&")[0];
       return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
     }
     // Vimeo
     if (url.includes("vimeo.com")) {
       const videoId = url.split("vimeo.com/")[1]?.split("?")[0];
       return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
     }
     return null;
   };
 
   const embedUrl = hasVideo ? getVideoEmbedUrl(videoUrl) : null;
 
   return (
     <Card className="overflow-hidden transition-all hover:shadow-lg border-2 border-border/50 hover:border-primary/20">
       <CardHeader className="pb-3 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5">
         <div className="flex items-start gap-3">
           <div className="p-2.5 rounded-xl bg-indigo-500 text-white">
             {hasVideo ? <PlayCircle className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
           </div>
           <div className="flex-1">
             <div className="flex items-center gap-2 mb-1">
               <Badge variant="outline" className="text-xs bg-background/50">
                 {contentType.toUpperCase()}
               </Badge>
               {hasVideo && (
                 <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
                   VIDEO
                 </Badge>
               )}
             </div>
             <CardTitle className="text-xl font-bold leading-tight">{title}</CardTitle>
           </div>
         </div>
       </CardHeader>
 
       <CardContent className="pt-4 space-y-4">
         {embedUrl && (
           <div className="relative w-full rounded-lg overflow-hidden bg-black aspect-video">
             <iframe
               src={embedUrl}
               className="absolute inset-0 w-full h-full"
               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
               allowFullScreen
             />
           </div>
         )}
         
         <div className="prose prose-sm max-w-none">
           <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
             {content}
           </p>
         </div>
       </CardContent>
     </Card>
   );
 };