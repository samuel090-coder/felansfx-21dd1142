import { useState, useCallback } from "react";
import { CURRENCIES, formatCurrency as baseFmt, convertFromNGN } from "@/lib/currency";

export type CurrencyCode = "NGN" | "USD" | "EUR" | "GBP";

const STORAGE_KEY = "preferred_currency";

export const useCurrencyPreference = () => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    return (localStorage.getItem(STORAGE_KEY) as CurrencyCode) || "NGN";
  });

  const setCurrency = useCallback((c: CurrencyCode) => {
    localStorage.setItem(STORAGE_KEY, c);
    setCurrencyState(c);
  }, []);

  /** Format an NGN amount in the user's preferred currency */
  const format = useCallback(
    (amountNGN: number, opts?: { decimals?: number }) => {
      if (currency === "NGN") return baseFmt(amountNGN, "NGN", { decimals: opts?.decimals ?? 0 });
      const converted = convertFromNGN(amountNGN, currency);
      return baseFmt(converted, currency, { decimals: opts?.decimals ?? 2 });
    },
    [currency]
  );

  const availableCurrencies = Object.values(CURRENCIES).map((c) => ({
    code: c.code as CurrencyCode,
    symbol: c.symbol,
    name: c.name,
  }));

  return { currency, setCurrency, format, availableCurrencies };
};
