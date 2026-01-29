import { useEffect, useRef, useCallback, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { CandleData } from "@/hooks/usePriceSimulation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FullscreenChartProps {
  candles: CandleData[];
  currentPrice: number;
  symbol: string;
  className?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export const FullscreenChart = ({ 
  candles, 
  currentPrice, 
  symbol, 
  className 
}: FullscreenChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const isDragging = useRef(false);
  const lastTouchDistance = useRef<number | null>(null);
  const lastPanX = useRef<number | null>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  const handleZoomOut = () => setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  const handleReset = () => {
    setZoom(1);
    setPanOffset(0);
  };

  // Handle touch gestures for pinch-to-zoom
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      isDragging.current = true;
      lastPanX.current = e.touches[0].clientX;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const delta = distance - lastTouchDistance.current;
      
      setZoom(prev => {
        const newZoom = prev + delta * 0.005;
        return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      });
      
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && isDragging.current && lastPanX.current !== null) {
      const delta = e.touches[0].clientX - lastPanX.current;
      setPanOffset(prev => prev + delta);
      lastPanX.current = e.touches[0].clientX;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    isDragging.current = false;
    lastPanX.current = null;
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || candles.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 10, right: 70, bottom: 10, left: 10 };

    // Clear with dark background
    ctx.fillStyle = "hsl(222, 47%, 8%)";
    ctx.fillRect(0, 0, width, height);

    // Apply zoom to visible candles
    const visibleCandleCount = Math.max(10, Math.floor(candles.length / zoom));
    const startIndex = Math.max(0, candles.length - visibleCandleCount + Math.floor(panOffset / 20));
    const endIndex = Math.min(candles.length, startIndex + visibleCandleCount);
    const visibleCandles = candles.slice(startIndex, endIndex);

    if (visibleCandles.length === 0) return;

    // Calculate price range from visible candles
    const prices = visibleCandles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const pricePadding = priceRange * 0.1;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const scaleX = (index: number) => padding.left + (index / (visibleCandles.length - 1 || 1)) * chartWidth;
    const scaleY = (price: number) => 
      padding.top + chartHeight - ((price - (minPrice - pricePadding)) / (priceRange + 2 * pricePadding)) * chartHeight;

    // Draw subtle grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    
    const gridLines = 8;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Draw price labels on left
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      const price = maxPrice + pricePadding - ((priceRange + 2 * pricePadding) / gridLines) * i;
      
      const decimals = symbol.includes("JPY") ? 3 : symbol.includes("BTC") || symbol.includes("XAU") ? 2 : 5;
      ctx.fillText(price.toFixed(decimals), 5, y + 4);
    }

    // Draw candlesticks with zoom applied
    const candleWidth = Math.max(4, Math.min(20, (chartWidth / visibleCandles.length) * 0.75 * zoom));
    const wickWidth = Math.max(1, zoom * 0.5);

    visibleCandles.forEach((candle, index) => {
      const x = scaleX(index);
      const isGreen = candle.close >= candle.open;
      
      // Vibrant colors like the screenshot
      const bodyColor = isGreen ? "#00E676" : "#FF5252";
      const wickColor = isGreen ? "#00C853" : "#D32F2F";

      // Draw wick
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = wickWidth;
      ctx.beginPath();
      ctx.moveTo(x, scaleY(candle.high));
      ctx.lineTo(x, scaleY(candle.low));
      ctx.stroke();

      // Draw body
      const openY = scaleY(candle.open);
      const closeY = scaleY(candle.close);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));
      
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x - candleWidth / 2, Math.min(openY, closeY), candleWidth, bodyHeight);
    });

    // Draw current price line
    const currentY = scaleY(currentPrice);
    const lastCandle = candles[candles.length - 1];
    const isUp = currentPrice >= lastCandle?.open;
    
    // Horizontal dashed line
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "rgba(0, 191, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, currentY);
    ctx.lineTo(width - padding.right, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price label (right side)
    const priceColor = isUp ? "#00E676" : "#FF5252";
    ctx.fillStyle = priceColor;
    
    // Draw rounded rect for price label
    const labelWidth = 65;
    const labelHeight = 22;
    const labelX = width - padding.right + 5;
    const labelY = currentY - labelHeight / 2;
    
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
    ctx.fill();
    
    // Price text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "left";
    const decimals = symbol.includes("JPY") ? 3 : symbol.includes("BTC") || symbol.includes("XAU") ? 2 : 5;
    ctx.fillText(currentPrice.toFixed(decimals), labelX + 5, currentY + 4);

  }, [candles, currentPrice, symbol, zoom, panOffset]);

  useEffect(() => {
    draw();
    
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <div 
      ref={containerRef} 
      className={cn("w-full h-full relative touch-none", className)}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
};
