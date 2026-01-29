import { useCallback } from "react";

export const useHapticFeedback = () => {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.log("Haptic feedback not supported:", error);
      }
    }
  }, []);

  const vibrateEntry = useCallback(() => {
    vibrate([50, 30, 50]); // Short double pulse for trade entry
  }, [vibrate]);

  const vibrateWin = useCallback(() => {
    vibrate([100, 50, 100, 50, 200]); // Celebratory pattern for win
  }, [vibrate]);

  const vibrateLoss = useCallback(() => {
    vibrate([200, 100, 200]); // Heavy pattern for loss
  }, [vibrate]);

  const vibrateTick = useCallback(() => {
    vibrate(30); // Quick tick
  }, [vibrate]);

  return {
    vibrateEntry,
    vibrateWin,
    vibrateLoss,
    vibrateTick,
  };
};
