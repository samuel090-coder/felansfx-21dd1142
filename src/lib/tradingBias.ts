// Per-symbol active-trade bias registry. Trading.tsx writes when a user opens a
// binary position; usePriceSimulation reads to nudge price *against* the user.
// This makes wins less guaranteed and discourages easy snipe trades.

export interface ActiveBias {
  symbol: string;
  direction: "buy" | "sell"; // user's chosen direction
  openedAt: number;
}

const biases = new Map<string, ActiveBias>(); // key: symbol -> latest active bias

export const registerBias = (symbol: string, direction: "buy" | "sell") => {
  biases.set(symbol, { symbol, direction, openedAt: Date.now() });
};

export const clearBias = (symbol: string) => {
  biases.delete(symbol);
};

export const getBias = (symbol: string): ActiveBias | undefined => biases.get(symbol);

// Returns +1 to bias price UP, -1 to bias DOWN, 0 if no active bias / expired
export const getBiasDirection = (symbol: string, lifetimeMs = 30000): number => {
  const b = biases.get(symbol);
  if (!b) return 0;
  if (Date.now() - b.openedAt > lifetimeMs) {
    biases.delete(symbol);
    return 0;
  }
  return b.direction === "buy" ? -1 : 1; // bias against the user
};
