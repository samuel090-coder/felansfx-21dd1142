import { useState, useEffect, useCallback, useRef } from "react";

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

// Generate realistic price movement using random walk with mean reversion
const generatePriceMovement = (
  currentPrice: number,
  basePrice: number,
  volatility: number
): number => {
  // Random component
  const random = (Math.random() - 0.5) * 2 * volatility * currentPrice;
  
  // Mean reversion (pull price back toward base)
  const meanReversion = (basePrice - currentPrice) * 0.001;
  
  // Trend component (slight random drift)
  const trend = (Math.random() - 0.5) * 0.0001 * currentPrice;
  
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
    close = generatePriceMovement(close, basePrice, volatility);
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

export const usePriceSimulation = (symbol: string, intervalMs: number = 1000) => {
  const [currentPrice, setCurrentPrice] = useState<number>(BASE_PRICES[symbol] || 1);
  const [previousClose, setPreviousClose] = useState<number>(BASE_PRICES[symbol] || 1);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [tick, setTick] = useState<TickData | null>(null);
  const priceRef = useRef(currentPrice);

  // Initialize with historical candles
  useEffect(() => {
    const basePrice = BASE_PRICES[symbol] || 1;
    const volatility = VOLATILITY[symbol] || VOLATILITY.default;
    
    // Generate 100 historical candles
    const historicalCandles: CandleData[] = [];
    let price = basePrice;
    const now = Date.now();
    
    for (let i = 99; i >= 0; i--) {
      const candle = generateCandle(symbol, price, intervalMs);
      candle.time = now - i * intervalMs;
      historicalCandles.push(candle);
      price = candle.close;
    }
    
    setCandles(historicalCandles);
    setCurrentPrice(price);
    setPreviousClose(basePrice);
    priceRef.current = price;
  }, [symbol, intervalMs]);

  // Update prices in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      const basePrice = BASE_PRICES[symbol] || 1;
      const volatility = VOLATILITY[symbol] || VOLATILITY.default;
      
      // Generate new price
      const newPrice = generatePriceMovement(priceRef.current, basePrice, volatility);
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
      
      // Add new candle every interval
      setCandles(prev => {
        const newCandle = generateCandle(symbol, prev[prev.length - 1]?.close || newPrice, intervalMs);
        const updated = [...prev.slice(-99), newCandle];
        return updated;
      });
    }, intervalMs);
    
    return () => clearInterval(interval);
  }, [symbol, intervalMs, previousClose]);

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
          const newPrice = generatePriceMovement(currentPrice, basePrice, volatility);
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
