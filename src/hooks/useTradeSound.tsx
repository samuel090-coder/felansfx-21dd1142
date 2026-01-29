import { useCallback, useRef } from "react";

// Trade sound frequencies for different actions
const SOUNDS = {
  entry: {
    frequencies: [523.25, 659.25, 783.99], // C5, E5, G5 chord
    duration: 150,
    type: "sine" as OscillatorType,
  },
  win: {
    frequencies: [523.25, 659.25, 783.99, 1046.5], // C major chord rising
    duration: 200,
    type: "sine" as OscillatorType,
  },
  loss: {
    frequencies: [293.66, 261.63], // D4 to C4 falling
    duration: 300,
    type: "triangle" as OscillatorType,
  },
  tick: {
    frequencies: [800],
    duration: 50,
    type: "square" as OscillatorType,
  },
};

export const useTradeSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: keyof typeof SOUNDS) => {
    try {
      const ctx = getAudioContext();
      const sound = SOUNDS[type];
      const now = ctx.currentTime;
      
      sound.frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = sound.type;
        oscillator.frequency.setValueAtTime(freq, now);
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + sound.duration / 1000);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        const startTime = now + (index * 0.05); // Slight delay for chord effect
        oscillator.start(startTime);
        oscillator.stop(startTime + sound.duration / 1000);
      });
    } catch (error) {
      console.log("Sound playback failed:", error);
    }
  }, [getAudioContext]);

  const playEntrySound = useCallback(() => {
    playSound("entry");
  }, [playSound]);

  const playWinSound = useCallback(() => {
    playSound("win");
  }, [playSound]);

  const playLossSound = useCallback(() => {
    playSound("loss");
  }, [playSound]);

  const playTickSound = useCallback(() => {
    playSound("tick");
  }, [playSound]);

  return {
    playEntrySound,
    playWinSound,
    playLossSound,
    playTickSound,
  };
};
