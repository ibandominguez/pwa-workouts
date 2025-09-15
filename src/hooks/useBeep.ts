import { useRef } from "react";

export function useBeep() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ensureCtx = () => {
    if (!ctxRef.current) {
      const Ctx = (
        window.AudioContext ||
        (window as Window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext!
      ) as typeof AudioContext;
      ctxRef.current = new Ctx();
    }
    if (ctxRef.current?.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current!;
  };

  const beep = (
    freq = 880,
    durationMs = 180,
    type: OscillatorType = "sine",
    volume = 0.2,
  ) => {
    try {
      const ctx = ensureCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      }, durationMs);
    } catch {
      // ignorar si autoplay bloquea
    }
  };

  const tickBeep = () => beep(1000, 120, "square", 0.15); // corto
  const longBeep = () => beep(700, 500, "sine", 0.25); // largo (cuando queda 1s)

  return { tickBeep, longBeep, beep };
}
