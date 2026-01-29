import { useEffect, useRef, useCallback } from "react";
import { CandleData } from "@/hooks/usePriceSimulation";
import { cn } from "@/lib/utils";

interface FullscreenChartProps {
  candles: CandleData[];
  currentPrice: number;
  symbol: string;
  className?: string;
}

export const FullscreenChart = ({ 
  candles, 
  currentPrice, 
  symbol, 
  className 
}: FullscreenChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

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

    // Calculate price range
    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.1;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const scaleX = (index: number) => padding.left + (index / (candles.length - 1)) * chartWidth;
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

    // Draw candlesticks
    const candleWidth = Math.max(6, (chartWidth / candles.length) * 0.75);
    const wickWidth = 1;

    candles.forEach((candle, index) => {
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

  }, [candles, currentPrice, symbol]);

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
      className={cn("w-full h-full relative", className)}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
