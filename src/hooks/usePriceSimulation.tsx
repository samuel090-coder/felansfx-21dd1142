import { useState, useEffect, useCallback, useRef } from "react";
import { getBiasDirection, isForcedBias } from "@/lib/tradingBias";



export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

// Base prices for different assets
const BASE_PRICES: Record<string, number> = {
  // Forex
  EURUSD: 1.0850,
  GBPUSD: 1.2650,
  USDJPY: 149.50,
  USDCHF: 0.8850,
  AUDUSD: 0.6550,
  USDCAD: 1.3550,
  NZDUSD: 0.6150,
  EURGBP: 0.8580,
  EURJPY: 162.20,
  GBPJPY: 189.10,
  // Crypto
  BTCUSD: 42500,
  ETHUSD: 2280,
  BNBUSD: 305,
  XRPUSD: 0.52,
  SOLUSD: 98,
  ADAUSD: 0.48,
  DOGEUSD: 0.078,
  DOTUSD: 7.20,
  LTCUSD: 68,
  LINKUSD: 14.50,
  // Commodities
  XAUUSD: 2035,
  XAGUSD: 23.50,
  XTIUSD: 78.50,
  XBRUSD: 82.30,
};

// Volatility multipliers (higher = more volatile)
const VOLATILITY: Record<string, number> = {
  BTCUSD: 0.002,
  ETHUSD: 0.0025,
  XAUUSD: 0.0008,
  EURUSD: 0.0003,
  GBPUSD: 0.0004,
  USDJPY: 0.0004,
  default: 0.0005,
};

// Generate realistic price movement using random walk with mean reversion,
// occasional shock ticks, and a slight bias against active user positions.
const generatePriceMovement = (
  currentPrice: number,
  basePrice: number,
  volatility: number,
  symbol?: string
): number => {
  // Higher base randomness
  let random = (Math.random() - 0.5) * 2 * volatility * currentPrice;

  // Reduced mean reversion (don't telegraph trends)
  const meanReversion = (basePrice - currentPrice) * 0.0004;

  // Random trend drift
  const trend = (Math.random() - 0.5) * 0.0002 * currentPrice;

  // Shock tick: ~6% chance of a 2-3x volatility spike in either direction
  if (Math.random() < 0.06) {
    const shockSign = Math.random() < 0.5 ? -1 : 1;
    random += shockSign * volatility * currentPrice * (2 + Math.random());
  }

  return currentPrice + random + meanReversion + trend;
};


// Generate a candle from tick data
const generateCandle = (
  symbol: string,
  previousClose: number,
  intervalMs: number
): CandleData => {
  const basePrice = BASE_PRICES[symbol] || previousClose;
  const volatility = VOLATILITY[symbol] || VOLATILITY.default;
  
  const open = previousClose;
  let high = open;
  let low = open;
  let close = open;
  
  // Simulate ticks within the candle
  const tickCount = Math.floor(intervalMs / 100);
  for (let i = 0; i < tickCount; i++) {
    close = generatePriceMovement(close, basePrice, volatility, symbol);
    high = Math.max(high, close);
    low = Math.min(low, close);
  }
  
  // Ensure valid OHLC
  high = Math.max(open, close, high);
  low = Math.min(open, close, low);
  
  const volume = Math.floor(Math.random() * 1000000) + 100000;
  
  return {
    time: Date.now(),
    open,
    high,
    low,
    close,
    volume,
  };
};

export const usePriceSimulation = (symbol: string, intervalMs: number = 3000) => {
  const [currentPrice, setCurrentPrice] = useState<number>(BASE_PRICES[symbol] || 1);
  const [previousClose, setPreviousClose] = useState<number>(BASE_PRICES[symbol] || 1);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [tick, setTick] = useState<TickData | null>(null);
  const priceRef = useRef(currentPrice);
  const candleAccumulatorRef = useRef<{ high: number; low: number; open: number; tickCount: number }>({
    high: 0,
    low: Infinity,
    open: 0,
    tickCount: 0,
  });

  // Initialize with historical candles - slower, more realistic
  useEffect(() => {
    const basePrice = BASE_PRICES[symbol] || 1;
    
    // Generate 50 historical candles with realistic spacing
    const historicalCandles: CandleData[] = [];
    let price = basePrice;
    const now = Date.now();
    const candleInterval = 60000; // 1-minute candles for historical data
    
    for (let i = 49; i >= 0; i--) {
      const candle = generateCandle(symbol, price, candleInterval);
      candle.time = now - i * candleInterval;
      historicalCandles.push(candle);
      price = candle.close;
    }
    
    setCandles(historicalCandles);
    setCurrentPrice(price);
    setPreviousClose(basePrice);
    priceRef.current = price;
    candleAccumulatorRef.current = { high: price, low: price, open: price, tickCount: 0 };
  }, [symbol]);

  // Update prices in real-time with realistic tick-by-tick movement
  useEffect(() => {
    const basePrice = BASE_PRICES[symbol] || 1;
    const volatility = VOLATILITY[symbol] || VOLATILITY.default;
    
    // Price tick update every 800-1500ms (randomized for realism)
    let tickTimeout: number;
    
    const updateTick = () => {
      // Small incremental price movement
      const microVolatility = volatility * 0.3; // Much smaller movements per tick
      const newPrice = generatePriceMovement(priceRef.current, basePrice, microVolatility, symbol);
      priceRef.current = newPrice;
      
      setCurrentPrice(newPrice);
      
      // Update tick data
      const change = newPrice - previousClose;
      const changePercent = (change / previousClose) * 100;
      
      setTick({
        symbol,
        price: newPrice,
        change,
        changePercent,
        timestamp: Date.now(),
      });
      
      // Track for candle formation
      const acc = candleAccumulatorRef.current;
      acc.high = Math.max(acc.high, newPrice);
      acc.low = Math.min(acc.low, newPrice);
      acc.tickCount++;
      
      // Schedule next tick with random delay for realism
      const nextDelay = 800 + Math.random() * 700; // 800-1500ms
      tickTimeout = window.setTimeout(updateTick, nextDelay);
    };
    
    // Start tick updates
    tickTimeout = window.setTimeout(updateTick, 1000);
    
    // Create new candle every 15-30 seconds (more realistic timeframe)
    const candleInterval = setInterval(() => {
      const acc = candleAccumulatorRef.current;
      if (acc.tickCount === 0) return;
      
      setCandles(prev => {
        const newCandle: CandleData = {
          time: Date.now(),
          open: acc.open,
          high: acc.high,
          low: acc.low,
          close: priceRef.current,
          volume: Math.floor(Math.random() * 500000) + 50000,
        };
        
        // Reset accumulator for next candle
        candleAccumulatorRef.current = {
          high: priceRef.current,
          low: priceRef.current,
          open: priceRef.current,
          tickCount: 0,
        };
        
        return [...prev.slice(-49), newCandle];
      });
    }, 15000 + Math.random() * 15000); // 15-30 second candles
    
    return () => {
      clearTimeout(tickTimeout);
      clearInterval(candleInterval);
    };
  }, [symbol, previousClose]);

  const getFormattedPrice = useCallback((price: number) => {
    if (symbol.includes("JPY")) {
      return price.toFixed(3);
    }
    if (["BTCUSD", "ETHUSD", "XAUUSD"].includes(symbol)) {
      return price.toFixed(2);
    }
    if (["XRPUSD", "DOGEUSD", "ADAUSD"].includes(symbol)) {
      return price.toFixed(4);
    }
    return price.toFixed(5);
  }, [symbol]);

  return {
    currentPrice,
    candles,
    tick,
    getFormattedPrice,
    basePrice: BASE_PRICES[symbol] || 1,
  };
};

export const useMultiSymbolPrices = (symbols: string[]) => {
  const [prices, setPrices] = useState<Record<string, TickData>>({});

  useEffect(() => {
    // Initialize prices
    const initial: Record<string, TickData> = {};
    symbols.forEach(symbol => {
      const basePrice = BASE_PRICES[symbol] || 1;
      initial[symbol] = {
        symbol,
        price: basePrice,
        change: 0,
        changePercent: 0,
        timestamp: Date.now(),
      };
    });
    setPrices(initial);

    // Update all prices periodically
    const interval = setInterval(() => {
      setPrices(prev => {
        const updated = { ...prev };
        symbols.forEach(symbol => {
          const basePrice = BASE_PRICES[symbol] || 1;
          const volatility = VOLATILITY[symbol] || VOLATILITY.default;
          const currentPrice = prev[symbol]?.price || basePrice;
          const newPrice = generatePriceMovement(currentPrice, basePrice, volatility, symbol);
          const change = newPrice - basePrice;
          const changePercent = (change / basePrice) * 100;
          
          updated[symbol] = {
            symbol,
            price: newPrice,
            change,
            changePercent,
            timestamp: Date.now(),
          };
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [symbols.join(",")]);

  return prices;
};
