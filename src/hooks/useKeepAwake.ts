/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import { useCallback, useEffect, useRef, useState } from "react";

// Tipos parciales porque no todas las domlibs tipan wakeLock todavía
type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
  removeEventListener: (type: "release", listener: () => void) => void;
};

let NoSleepModule: any | null = null; // carga perezosa para evitar costo si no hace falta

export type KeepAwakeSupport = "wakeLock" | "nosleep" | "none";

export interface UseKeepAwakeOptions {
  /** Si true, reintenta automáticamente al volver a pestaña visible (por defecto true). */
  autoReacquire?: boolean;
  /** Forzar uso de NoSleep incluso si existe Wake Lock (tests/legacy). */
  forceNoSleep?: boolean;
}

export interface UseKeepAwake {
  active: boolean;
  supported: KeepAwakeSupport;
  error: Error | null;
  request: () => Promise<void>; // Llamar tras un gesto del usuario (click/tap)
  release: () => Promise<void>;
}

export function useKeepAwake(options: UseKeepAwakeOptions = {}): UseKeepAwake {
  const { autoReacquire = true, forceNoSleep = false } = options;

  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState<KeepAwakeSupport>("none");
  const [error, setError] = useState<Error | null>(null);

  const wakeSentinelRef = useRef<WakeLockSentinel | null>(null);
  const nosleepRef = useRef<any | null>(null);
  const lastTriedWakeLockRef = useRef(false); // sabemos si era wakeLock el modo activo

  // Detectar soporte
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasWake = "wakeLock" in navigator && !forceNoSleep;
    if (hasWake) {
      setSupported("wakeLock");
      return;
    }
    setSupported("nosleep"); // asumimos que podremos cargar NoSleep como fallback
  }, [forceNoSleep]);

  const requestWakeLock = useCallback(async () => {
    // @ts-ignore: wakeLock no está en todos los tipos
    const wl = (navigator as any).wakeLock;
    if (!wl) throw new Error("Wake Lock no soportado");

    const sentinel: WakeLockSentinel = await wl.request("screen");
    wakeSentinelRef.current = sentinel;
    lastTriedWakeLockRef.current = true;
    setActive(true);
    setError(null);

    const onRelease = () => setActive(false);
    sentinel.addEventListener("release", onRelease);
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeSentinelRef.current?.release();
    } finally {
      wakeSentinelRef.current = null;
      setActive(false);
    }
  }, []);

  const requestNoSleep = useCallback(async () => {
    if (!NoSleepModule) {
      // Carga dinámica para reducir peso inicial
      const mod = await import("nosleep.js");
      NoSleepModule = mod.default ?? mod;
    }
    if (!nosleepRef.current) nosleepRef.current = new NoSleepModule();
    // Requiere gesto del usuario
    await nosleepRef.current.enable();
    lastTriedWakeLockRef.current = false;
    setActive(true);
    setError(null);
  }, []);

  const releaseNoSleep = useCallback(async () => {
    try {
      nosleepRef.current?.disable();
    } finally {
      setActive(false);
    }
  }, []);

  const request = useCallback(async () => {
    try {
      if (supported === "wakeLock") {
        await requestWakeLock();
      } else if (supported === "nosleep") {
        await requestNoSleep();
      } else {
        throw new Error(
          "Mantener pantalla activa no soportado en este navegador",
        );
      }
    } catch (e: any) {
      // Si wakeLock falla por permisos/gesto, intenta fallback
      if (supported === "wakeLock") {
        const name = e?.name || "";
        if (
          name === "NotAllowedError" ||
          name === "SecurityError" ||
          name === "AbortError"
        ) {
          try {
            await requestNoSleep();
            return;
          } catch (fallbackErr) {
            setError(fallbackErr as Error);
            setActive(false);
            return;
          }
        }
      }
      setError(e instanceof Error ? e : new Error(String(e)));
      setActive(false);
    }
  }, [requestNoSleep, requestWakeLock, supported]);

  const release = useCallback(async () => {
    setError(null);
    if (supported === "wakeLock" && wakeSentinelRef.current) {
      await releaseWakeLock();
    } else if (supported !== "none" && nosleepRef.current) {
      await releaseNoSleep();
    } else {
      setActive(false);
    }
  }, [releaseNoSleep, releaseWakeLock, supported]);

  // Re-adquirir al volver a visible (algunos SO liberan el wake lock)
  useEffect(() => {
    if (!autoReacquire) return;

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      // Solo reintenta si el usuario lo tenía activo
      if (!active) return;

      // Si era wakeLock, reintenta wakeLock primero; si falla, cae a NoSleep
      (async () => {
        try {
          if (
            supported === "wakeLock" &&
            wakeSentinelRef.current == null &&
            lastTriedWakeLockRef.current
          ) {
            await requestWakeLock();
          } else if (
            supported === "nosleep" &&
            nosleepRef.current &&
            typeof nosleepRef.current.enable === "function"
          ) {
            await nosleepRef.current.enable().catch(() => {});
          }
        } catch {
          // Silencioso; el usuario puede volver a pulsar el botón si falla
        }
      })();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [active, autoReacquire, requestWakeLock, supported]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      // No hacemos await en un unmount
      if (wakeSentinelRef.current) void wakeSentinelRef.current.release();
      if (nosleepRef.current) nosleepRef.current.disable();
      wakeSentinelRef.current = null;
      nosleepRef.current = null;
    };
  }, []);

  return { active, supported, error, request, release };
}
