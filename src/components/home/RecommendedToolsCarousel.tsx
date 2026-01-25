import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RecommendedTool {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  redirect_url: string;
}

export const RecommendedToolsCarousel = () => {
  const [tools, setTools] = useState<RecommendedTool[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchTools = async () => {
      const { data } = await supabase
        .from("recommended_tools")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      setTools(data || []);
      setLoading(false);
    };
    fetchTools();
  }, []);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      return () => el.removeEventListener("scroll", checkScroll);
    }
  }, [tools]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (loading || tools.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-display font-semibold">Fxlens Recommended Tools</h2>
        <div className="flex items-center gap-1">
          <div className="w-16 h-1.5 rounded-full bg-primary" />
          <div className="w-8 h-1.5 rounded-full bg-muted" />
        </div>
      </div>

      <div className="relative group">
        {/* Scroll Buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/90 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/90 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {tools.map((tool) => (
            <a
              key={tool.id}
              href={tool.redirect_url}
              className="flex-shrink-0 w-[260px] snap-start"
            >
              <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow h-full">
                {tool.image_url && (
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={tool.image_url}
                      alt={tool.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className={cn("p-3", !tool.image_url && "pt-4")}>
                  <h3 className="font-semibold text-sm mb-1 line-clamp-1">{tool.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
