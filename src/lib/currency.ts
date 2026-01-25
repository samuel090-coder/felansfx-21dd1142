// Currency conversion utilities
// Default currency is Nigerian Naira (NGN)

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Rate relative to NGN (1 NGN = X of this currency)
}

// Exchange rates (NGN as base currency)
// These are approximate rates - in production, use a real-time API
export const CURRENCIES: Record<string, CurrencyConfig> = {
  NGN: {
    code: "NGN",
    symbol: "₦",
    name: "Nigerian Naira",
    rate: 1,
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    rate: 0.00063, // 1 NGN ≈ 0.00063 USD (1 USD ≈ 1580 NGN)
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    rate: 0.00058, // 1 NGN ≈ 0.00058 EUR
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    rate: 0.00050, // 1 NGN ≈ 0.00050 GBP
  },
};

// Default currency for the app (Nigerian Naira)
export const DEFAULT_CURRENCY = CURRENCIES.NGN;

/**
 * Convert amount from NGN to another currency
 */
export function convertFromNGN(amountInNGN: number, targetCurrency: string): number {
  const currency = CURRENCIES[targetCurrency];
  if (!currency) {
    console.warn(`Unknown currency: ${targetCurrency}, using NGN`);
    return amountInNGN;
  }
  return amountInNGN * currency.rate;
}

/**
 * Convert amount from another currency to NGN
 */
export function convertToNGN(amount: number, sourceCurrency: string): number {
  const currency = CURRENCIES[sourceCurrency];
  if (!currency) {
    console.warn(`Unknown currency: ${sourceCurrency}, using NGN`);
    return amount;
  }
  return amount / currency.rate;
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = "NGN",
  options: { showSymbol?: boolean; decimals?: number } = {}
): string {
  const { showSymbol = true, decimals = 2 } = options;
  const currency = CURRENCIES[currencyCode] || DEFAULT_CURRENCY;
  
  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return showSymbol ? `${currency.symbol}${formattedAmount}` : formattedAmount;
}

/**
 * Format NGN amount and show both NGN and USD equivalent
 */
export function formatWithConversion(amountInNGN: number): {
  ngn: string;
  usd: string;
  combined: string;
} {
  const usdAmount = convertFromNGN(amountInNGN, "USD");
  
  return {
    ngn: formatCurrency(amountInNGN, "NGN"),
    usd: formatCurrency(usdAmount, "USD"),
    combined: `${formatCurrency(amountInNGN, "NGN")} (~${formatCurrency(usdAmount, "USD")})`,
  };
}

/**
 * Get currency symbol by code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCIES[currencyCode]?.symbol || "₦";
}

/**
 * Parse a currency string to get the numeric value
 */
export function parseCurrencyString(value: string): number {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[₦$€£,\s]/g, "");
  return parseFloat(cleaned) || 0;
}
