import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, ZoomIn, Camera, Contrast, Timer, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface GuideContent {
  id: string;
  section_type: string;
  title: string;
  description: string | null;
  image_url: string | null;
  icon_name: string | null;
  display_order: number;
}

const iconMap: { [key: string]: React.ElementType } = {
  camera: Camera,
  contrast: Contrast,
  zoom: ZoomIn,
  timer: Timer,
  clock: Clock,
};

const ScreenshotGuide = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [content, setContent] = useState<GuideContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase
        .from("screenshot_guide_content")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      setContent(data || []);
      setLoading(false);
    };
    fetchContent();
  }, []);

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (!user) return null;

  const header = content.find((c) => c.section_type === "header");
  const goodExample = content.find((c) => c.section_type === "good_example");
  const badExample = content.find((c) => c.section_type === "bad_example");
  const checklistItems = content.filter((c) => c.section_type === "checklist_item");

  return (
    <AppLayout hideNav>
      <div className="min-h-screen pb-8">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-display font-semibold">Screenshot Guide</h1>
          </div>
        </div>

        <div className="px-4 pt-4">
          {/* Header Content */}
          {header && (
            <div className="text-center mb-6">
              <h2 className="text-xl font-display font-bold mb-2">
                {header.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {header.description}
              </p>
            </div>
          )}

          {/* Good Example */}
          {goodExample && (
            <Card className="mb-4 border-2 border-primary/50 overflow-hidden">
              <CardContent className="p-0">
                {goodExample.image_url && (
                  <div 
                    className="relative h-64 overflow-hidden cursor-pointer"
                    onClick={() => setExpandedImage(goodExample.image_url)}
                  >
                    <div className="absolute top-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/90 text-white text-sm font-medium">
                        <Check className="w-4 h-4" />
                        Good
                      </span>
                    </div>
                    <img
                      src={goodExample.image_url}
                      alt="Good example"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold mb-1">{goodExample.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {goodExample.description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => goodExample.image_url && setExpandedImage(goodExample.image_url)}
                  >
                    <ZoomIn className="w-4 h-4 mr-2" />
                    Tap to expand
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bad Example */}
          {badExample && (
            <Card className="mb-6 border-2 border-destructive/50 overflow-hidden">
              <CardContent className="p-0">
                {badExample.image_url && (
                  <div 
                    className="relative h-64 overflow-hidden cursor-pointer"
                    onClick={() => setExpandedImage(badExample.image_url)}
                  >
                    <div className="absolute top-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/90 text-white text-sm font-medium">
                        <X className="w-4 h-4" />
                        Bad
                      </span>
                    </div>
                    <img
                      src={badExample.image_url}
                      alt="Bad example"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold mb-1">{badExample.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {badExample.description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => badExample.image_url && setExpandedImage(badExample.image_url)}
                  >
                    <ZoomIn className="w-4 h-4 mr-2" />
                    Tap to expand
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checklist */}
          {checklistItems.length > 0 && (
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center">
                    <span className="text-xs font-bold">i</span>
                  </div>
                  <span className="font-medium">Quick checklist for better results</span>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                {checklistItems.map((item, index) => {
                  const IconComponent = iconMap[item.icon_name || "camera"] || Camera;
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6 px-4">
            You can always revisit this guide in Settings → Screenshot guide
          </p>
        </div>
      </div>

      {/* Image Expand Dialog */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Expanded Image</DialogTitle>
          {expandedImage && (
            <img
              src={expandedImage}
              alt="Expanded view"
              className="w-full h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ScreenshotGuide;
