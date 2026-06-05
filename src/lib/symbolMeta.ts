export interface SymbolMeta {
  name: string;
  icon: string;
}

export const SYMBOL_META: Record<string, SymbolMeta> = {
  EURUSD: { name: "Euro / US Dollar", icon: "💶" },
  GBPUSD: { name: "Pound / US Dollar", icon: "💷" },
  USDJPY: { name: "Dollar / Yen", icon: "💴" },
  USDCHF: { name: "Dollar / Franc", icon: "🇨🇭" },
  AUDUSD: { name: "Aussie / US Dollar", icon: "🇦🇺" },
  USDCAD: { name: "Dollar / Loonie", icon: "🇨🇦" },
  NZDUSD: { name: "Kiwi / US Dollar", icon: "🇳🇿" },
  BTCUSD: { name: "Bitcoin / US Dollar", icon: "₿" },
  ETHUSD: { name: "Ethereum / US Dollar", icon: "Ξ" },
  BNBUSD: { name: "BNB / US Dollar", icon: "🟡" },
  XRPUSD: { name: "Ripple / US Dollar", icon: "✕" },
  SOLUSD: { name: "Solana / US Dollar", icon: "◎" },
  ADAUSD: { name: "Cardano / US Dollar", icon: "₳" },
  XAUUSD: { name: "Gold / US Dollar", icon: "🥇" },
  XAGUSD: { name: "Silver / US Dollar", icon: "🥈" },
  XTIUSD: { name: "WTI Crude / US Dollar", icon: "🛢️" },
  XBRUSD: { name: "Brent Crude / US Dollar", icon: "🛢️" },
};

export const SYMBOL_GROUPS: Record<string, string[]> = {
  Forex: ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD"],
  Crypto: ["BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD", "ADAUSD"],
  Commodities: ["XAUUSD", "XAGUSD", "XTIUSD", "XBRUSD"],
};

export const getSymbolMeta = (symbol: string): SymbolMeta =>
  SYMBOL_META[symbol] || { name: symbol, icon: symbol.substring(0, 3) };
