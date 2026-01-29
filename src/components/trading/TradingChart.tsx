import { useEffect, useRef } from "react";
import { CandleData } from "@/hooks/usePriceSimulation";
import { cn } from "@/lib/utils";

interface TradingChartProps {
  candles: CandleData[];
  currentPrice: number;
  symbol: string;
  className?: string;
}

export const TradingChart = ({ candles, currentPrice, symbol, className }: TradingChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || candles.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 60, bottom: 30, left: 10 };

    // Clear canvas
    ctx.fillStyle = "hsl(222.2, 84%, 4.9%)";
    ctx.fillRect(0, 0, width, height);

    // Calculate price range
    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.1;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Scale functions
    const scaleX = (index: number) => padding.left + (index / (candles.length - 1)) * chartWidth;
    const scaleY = (price: number) => 
      padding.top + chartHeight - ((price - (minPrice - pricePadding)) / (priceRange + 2 * pricePadding)) * chartHeight;

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels
      const price = maxPrice + pricePadding - ((priceRange + 2 * pricePadding) / gridLines) * i;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(price.toFixed(symbol.includes("JPY") ? 3 : symbol.includes("BTC") ? 0 : 4), width - padding.right + 5, y + 3);
    }

    // Draw candlesticks
    const candleWidth = Math.max(3, (chartWidth / candles.length) * 0.7);
    const wickWidth = 1;

    candles.forEach((candle, index) => {
      const x = scaleX(index);
      const isGreen = candle.close >= candle.open;
      
      // Colors
      const bodyColor = isGreen ? "#22c55e" : "#ef4444";
      const wickColor = isGreen ? "#16a34a" : "#dc2626";

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
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x - candleWidth / 2, Math.min(openY, closeY), candleWidth, bodyHeight);
    });

    // Draw current price line
    const currentY = scaleY(currentPrice);
    const lastCandle = candles[candles.length - 1];
    const isUp = currentPrice >= lastCandle.open;
    
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = isUp ? "#22c55e" : "#ef4444";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, currentY);
    ctx.lineTo(width - padding.right, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price label
    ctx.fillStyle = isUp ? "#22c55e" : "#ef4444";
    ctx.fillRect(width - padding.right, currentY - 10, 55, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(currentPrice.toFixed(symbol.includes("JPY") ? 3 : symbol.includes("BTC") ? 0 : 4), width - padding.right + 4, currentY + 4);

  }, [candles, currentPrice, symbol]);

  return (
    <div ref={containerRef} className={cn("w-full h-full min-h-[300px]", className)}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
