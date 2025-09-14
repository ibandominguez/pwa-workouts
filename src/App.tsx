import React, { useEffect, useMemo, useRef } from "react";
import { create } from "zustand";

/**
 * -----------------------------------------------------------
 *  Workout SPA en un solo archivo (React + Tailwind + Zustand)
 *  - Pega en tu App.tsx
 *  - Asume Tailwind ya configurado
 * -----------------------------------------------------------
 */

type Exercise = {
  name: string;
  description: string;
  mediaUrl?: string;
  workingSeconds?: number; // Si existe => ejercicio por tiempo
  restingSeconds?: number; // Descanso DESPUÉS del ejercicio (se omite en el último)
  repetitionsCount?: number; // Si existe y no hay workingSeconds => por reps (sin tiempo)
};

type Workout = {
  id: string;
  name: string;
  dificultyLevel: 1 | 2 | 3 | 4 | 5;
  exercises: Exercise[];
};

type Phase = "work" | "rest";
type Screen = "list" | "prestart" | "running" | "finished";

type State = {
  workouts: Workout[];
  screen: Screen;

  selectedWorkoutId?: string;
  currentIndex: number;
  phase: Phase;
  secondsLeft: number; // para prestart, trabajo con tiempo y descansos
  prestartSeconds: number;
  paused: boolean;

  // Actions
  selectWorkout: (id: string) => void;
  startPrestart: () => void;
  startWorkout: () => void;
  tick: () => void;
  nextStepForReps: () => void;
  togglePause: () => void;
  stopWorkout: () => void;
  goHome: () => void;
  setSecondsLeft: (n: number) => void;
};

const useStore = create<State>((set, get) => ({
  // --- Workouts de prueba que cubren todas las casuísticas ---
  workouts: [
    {
      id: "w1",
      name: "HIIT Express",
      dificultyLevel: 3,
      exercises: [
        {
          name: "Jumping Jacks",
          description:
            "Activa el cuerpo con saltos abriendo y cerrando piernas y brazos.",
          mediaUrl:
            "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=1200&auto=format&fit=crop",
          workingSeconds: 30,
          restingSeconds: 15,
        },
        {
          name: "Sentadillas",
          description: "Espalda recta, peso en talones.",
          mediaUrl:
            "https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=1200&auto=format&fit=crop",
          repetitionsCount: 15,
          restingSeconds: 20,
        },
        {
          name: "Plancha",
          description: "Mantén el core apretado y la espalda alineada.",
          mediaUrl:
            "https://images.unsplash.com/photo-1599058918140-7e9d8d0d3e90?q=80&w=1200&auto=format&fit=crop",
          workingSeconds: 45,
          restingSeconds: 30,
        },
      ],
    },
    {
      id: "w2",
      name: "Fuerza Superior",
      dificultyLevel: 4,
      exercises: [
        {
          name: "Flexiones",
          description: "Codos a 45°, pecho cerca del suelo.",
          mediaUrl:
            "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop",
          repetitionsCount: 12,
          restingSeconds: 20,
        },
        {
          name: "Fondos en banco",
          description: "Hombros abajo y atrás.",
          repetitionsCount: 12,
          restingSeconds: 20,
        },
        {
          name: "Plancha lateral",
          description: "Mantén la cadera alta.",
          workingSeconds: 30,
          restingSeconds: 0, // (último: igualmente se omite descanso)
        },
      ],
    },
    {
      id: "w3",
      name: "Cardio Suave",
      dificultyLevel: 2,
      exercises: [
        {
          name: "Marcha en sitio",
          description: "Eleva rodillas de forma controlada.",
          workingSeconds: 40,
          restingSeconds: 15,
        },
        {
          name: "Elevaciones de rodilla",
          description: "Alterna con ritmo constante.",
          workingSeconds: 40,
          restingSeconds: 15,
        },
        {
          name: "Talones al glúteo",
          description: "Mantén postura erguida.",
          workingSeconds: 40,
          // Si tuviera descanso, se omite por ser el último.
        },
      ],
    },
  ],

  screen: "list",
  selectedWorkoutId: undefined,
  currentIndex: 0,
  phase: "work",
  secondsLeft: 0,
  prestartSeconds: 5,
  paused: false,

  selectWorkout: (id) =>
    set({
      selectedWorkoutId: id,
      screen: "prestart",
      currentIndex: 0,
      phase: "work",
      secondsLeft: 5, // countdown de inicio
      paused: false,
    }),

  startPrestart: () =>
    set({ screen: "prestart", secondsLeft: 5, paused: false }),

  startWorkout: () => {
    const { selectedWorkoutId, workouts } = get();
    if (!selectedWorkoutId) return;
    const w = workouts.find((x) => x.id === selectedWorkoutId)!;
    const ex = w.exercises[0];
    if (ex.workingSeconds) {
      set({
        screen: "running",
        phase: "work",
        secondsLeft: ex.workingSeconds,
        paused: false,
      });
    } else {
      // reps: sin tiempo; esperar botón Siguiente
      set({ screen: "running", phase: "work", secondsLeft: 0, paused: false });
    }
  },

  tick: () => {
    const { secondsLeft } = get();
    if (secondsLeft > 0) set({ secondsLeft: secondsLeft - 1 });
  },

  setSecondsLeft: (n) => set({ secondsLeft: n }),

  nextStepForReps: () => {
    // Avanza (descanso / siguiente / fin) SOLO cuando el usuario pulse Siguiente.
    const { selectedWorkoutId, workouts, currentIndex } = get();
    if (!selectedWorkoutId) return;
    const w = workouts.find((x) => x.id === selectedWorkoutId)!;
    const ex = w.exercises[currentIndex];
    const isLast = currentIndex >= w.exercises.length - 1;

    if (isLast) {
      set({ screen: "finished" });
      return;
    }

    const rest = Math.max(0, ex.restingSeconds ?? 0);
    if (rest > 0) {
      set({ phase: "rest", secondsLeft: rest, paused: false });
    } else {
      const nextEx = w.exercises[currentIndex + 1];
      set({
        currentIndex: currentIndex + 1,
        phase: "work",
        secondsLeft: nextEx.workingSeconds ?? 0,
        paused: false,
      });
    }
  },

  togglePause: () => set((s) => ({ paused: !s.paused })),

  stopWorkout: () =>
    set({
      screen: "list",
      selectedWorkoutId: undefined,
      currentIndex: 0,
      phase: "work",
      secondsLeft: 0,
      paused: false,
    }),

  goHome: () =>
    set({
      screen: "list",
      selectedWorkoutId: undefined,
      currentIndex: 0,
      phase: "work",
      secondsLeft: 0,
      paused: false,
    }),
}));

/** ---------------------- Sonidos (pitidos) ---------------------- */
function useBeep() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ensureCtx = () => {
    if (!ctxRef.current) {
      const Ctx = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
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

/** ---------------------- Utilidades ---------------------- */
const fmt = (total: number) => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const DifficultyDots: React.FC<{ level: number }> = ({ level }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <span
        key={n}
        className={`inline-block h-2 w-2 rounded-full ${n <= level ? "bg-amber-500" : "bg-gray-300"}`}
      />
    ))}
  </div>
);

/** ---------------------- App ---------------------- */
const App: React.FC = () => {
  const {
    workouts,
    screen,
    selectedWorkoutId,
    currentIndex,
    phase,
    secondsLeft,
    paused,
    selectWorkout,
    startWorkout,
    tick,
    nextStepForReps,
    togglePause,
    stopWorkout,
    goHome,
    setSecondsLeft,
  } = useStore();

  const selectedWorkout = useMemo(
    () => workouts.find((w) => w.id === selectedWorkoutId),
    [workouts, selectedWorkoutId],
  );

  const { tickBeep, longBeep } = useBeep();

  // Timer global (prestart, trabajo con tiempo, descanso)
  useEffect(() => {
    if (screen === "list" || screen === "finished") return;
    if (paused) return;
    if (secondsLeft > 0) {
      const id = setInterval(() => useStore.getState().tick(), 1000);
      return () => clearInterval(id);
    }
  }, [screen, secondsLeft, paused, tick]);

  // Pitidos por cada segundo y pitido largo al quedar 1s (solo cuando hay countdown activo)
  const prevSecRef = useRef<number>(secondsLeft);
  useEffect(() => {
    const prev = prevSecRef.current;
    if (secondsLeft !== prev) {
      if (secondsLeft > 1 && secondsLeft <= 5) tickBeep();
      else if (secondsLeft === 1) longBeep();
      prevSecRef.current = secondsLeft;
    }
  }, [secondsLeft, tickBeep, longBeep]);

  // Al terminar el prestart, empezar workout
  useEffect(() => {
    if (screen === "prestart" && secondsLeft === 0) startWorkout();
  }, [screen, secondsLeft, startWorkout]);

  // Transiciones al llegar a 0: SOLO para (trabajo con tiempo) o (descanso)
  useEffect(() => {
    if (screen !== "running" || secondsLeft !== 0) return;
    if (!selectedWorkout) return;

    const ex = selectedWorkout.exercises[currentIndex];
    const isTimeExercise = !!ex.workingSeconds;
    const isLast = currentIndex >= selectedWorkout.exercises.length - 1;

    if (phase === "work" && !isTimeExercise) {
      // Ejercicio por reps: NO auto-avanzar; esperar botón Siguiente
      return;
    }

    if (phase === "work") {
      const rest = Math.max(0, ex.restingSeconds ?? 0);
      if (!isLast && rest > 0) {
        useStore.setState({ phase: "rest", secondsLeft: rest, paused: false });
      } else {
        if (isLast) {
          useStore.setState({ screen: "finished" });
        } else {
          const nextEx = selectedWorkout.exercises[currentIndex + 1];
          useStore.setState({
            currentIndex: currentIndex + 1,
            phase: "work",
            secondsLeft: nextEx.workingSeconds ?? 0,
            paused: false,
          });
        }
      }
    } else if (phase === "rest") {
      if (isLast) {
        useStore.setState({ screen: "finished" });
      } else {
        const nextEx = selectedWorkout.exercises[currentIndex + 1];
        useStore.setState({
          currentIndex: currentIndex + 1,
          phase: "work",
          secondsLeft: nextEx.workingSeconds ?? 0,
          paused: false,
        });
      }
    }
  }, [screen, secondsLeft, phase, currentIndex, selectedWorkout]);

  // Derivados UI
  const ex = selectedWorkout?.exercises[currentIndex];
  const isTimeExercise = !!ex?.workingSeconds;
  const totalExercises = selectedWorkout?.exercises.length ?? 0;

  // Progreso global (suave durante trabajo con tiempo; estático en reps/rest)
  const globalProgress = useMemo(() => {
    if (!selectedWorkout) return 0;
    const base = currentIndex / selectedWorkout.exercises.length;
    if (
      screen === "running" &&
      phase === "work" &&
      isTimeExercise &&
      ex?.workingSeconds
    ) {
      const done = ex.workingSeconds - secondsLeft;
      const frac = Math.min(1, Math.max(0, done / ex.workingSeconds));
      return Math.min(1, base + frac / selectedWorkout.exercises.length);
    }
    return base;
  }, [
    selectedWorkout,
    currentIndex,
    phase,
    ex,
    isTimeExercise,
    secondsLeft,
    screen,
  ]);

  // Color de fondo (trabajo=azul, descanso=verde)
  const workoutBg =
    screen === "running"
      ? phase === "rest"
        ? "bg-green-600"
        : "bg-blue-600"
      : "bg-white";

  /** ---------------------- Pantallas ---------------------- */

  const ListScreen = (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">🏋️ Workout</h1>
      <p className="text-sm text-gray-600 mb-4">
        Elige un <strong>workout</strong> para comenzar. Al pulsar verás un
        countdown de 5s con pitidos. En el último segundo, sonará un pitido
        largo de inicio.
      </p>
      <div className="space-y-3">
        {workouts.map((w) => (
          <button
            key={w.id}
            onClick={() => selectWorkout(w.id)}
            className="w-full rounded-xl border border-gray-200 p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">{w.name}</div>
              <DifficultyDots level={w.dificultyLevel} />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {w.exercises.length} ejercicios •{" "}
              {w.exercises.some((e) => e.workingSeconds)
                ? "Con tiempo"
                : "Sólo repeticiones"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const PrestartScreen = (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-semibold mb-2">{selectedWorkout?.name}</h2>
      <div className="text-sm text-gray-600 mb-6">
        Comenzamos en <span className="font-semibold">{secondsLeft}s</span>…
      </div>
      <div className="flex items-center justify-center my-10">
        <div className="w-40 h-40 rounded-full bg-gray-100 flex items-center justify-center text-5xl font-bold">
          {secondsLeft}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={stopWorkout}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={() => setSecondsLeft(1)} // para pruebas: salta prestart (emitirá pitido largo)
          className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-3 font-semibold"
        >
          Saltar a inicio
        </button>
      </div>
    </div>
  );

  const RunningScreen = (
    <div className={`min-h-[100dvh] ${workoutBg} text-white`}>
      <div className="max-w-md mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={stopWorkout}
            className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-sm"
          >
            Parar
          </button>
          <div className="text-sm opacity-90">
            {selectedWorkout?.name} • #{currentIndex + 1}/{totalExercises}
          </div>
          <button
            onClick={togglePause}
            className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-sm"
          >
            {paused ? "Reanudar" : "Pausa"}
          </button>
        </div>

        {/* Progreso global */}
        <div className="mt-4 w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-2 bg-white/80"
            style={{ width: `${Math.round(globalProgress * 100)}%` }}
          />
        </div>

        {/* Card */}
        <div className="mt-6 rounded-2xl bg-white text-gray-900 overflow-hidden shadow-lg">
          {/* Media / Descanso */}
          {phase === "rest" ? (
            <div className="h-48 sm:h-56 w-full flex items-center justify-center bg-green-100">
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">Descanso</div>
                <div className="text-sm text-gray-600">
                  Próximo:{" "}
                  <span className="font-medium">
                    {selectedWorkout?.exercises[currentIndex + 1]?.name ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : ex?.mediaUrl ? (
            <img
              src={ex.mediaUrl}
              alt={ex.name}
              className="h-48 sm:h-56 w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="h-48 sm:h-56 w-full flex items-center justify-center bg-gray-100">
              <span className="text-2xl">💪</span>
            </div>
          )}

          {/* Contenido */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-semibold">
                  {phase === "rest" ? "Descanso" : ex?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {phase === "rest" ? "Respira y prepárate." : ex?.description}
                </div>
              </div>
              <div className="text-right">
                {/* Timer / Reps label */}
                {phase === "rest" || isTimeExercise ? (
                  <div className="rounded-lg bg-gray-900 text-white px-3 py-2 inline-block">
                    <div className="text-xs opacity-70 text-right">Tiempo</div>
                    <div className="text-2xl font-mono">{fmt(secondsLeft)}</div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-900 text-white px-3 py-2 inline-block">
                    <div className="text-xs opacity-70 text-right">Reps</div>
                    <div className="text-2xl font-semibold">
                      {ex?.repetitionsCount}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Progreso del ejercicio (solo si es por tiempo) */}
            {phase === "work" && isTimeExercise && ex?.workingSeconds ? (
              <div className="mt-4">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-blue-600"
                    style={{
                      width: `${Math.round(
                        ((ex.workingSeconds - secondsLeft) /
                          ex.workingSeconds) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}

            {/* Controles */}
            <div className="mt-6 flex gap-3">
              {phase === "work" && !isTimeExercise ? (
                <button
                  onClick={nextStepForReps}
                  className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-3 font-semibold"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={() => useStore.setState({ paused: !paused })}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-medium"
                >
                  {paused ? "Reanudar" : "Pausar"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hint */}
        <div className="mt-4 text-xs text-white/80 text-center">
          {phase === "rest"
            ? "La imagen se oculta durante el descanso. Mira el siguiente ejercicio."
            : isTimeExercise
              ? "Barra superior: progreso global. Barra azul: progreso del ejercicio."
              : "Ejercicio por repeticiones: pulsa “Siguiente” cuando termines."}
        </div>
      </div>
    </div>
  );

  const FinishedScreen = (
    <div className="min-h-[100dvh] bg-purple-600 text-white flex items-center">
      <div className="max-w-md mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">¡Workout completado!</h2>
        <p className="opacity-90">
          Buen trabajo con{" "}
          <span className="font-semibold">{selectedWorkout?.name}</span>.
        </p>
        <button
          onClick={goHome}
          className="mt-8 w-full rounded-xl bg-white text-purple-700 px-4 py-3 font-semibold"
        >
          Volver al listado
        </button>
      </div>
    </div>
  );

  // Render root
  return (
    <div className="min-h-[100dvh] bg-white">
      {screen === "list" && ListScreen}
      {screen === "prestart" && PrestartScreen}
      {screen === "running" && RunningScreen}
      {screen === "finished" && FinishedScreen}
    </div>
  );
};

export default App;

/**
 * Notas:
 * - Ejercicios por reps: NO auto-avanzan; se avanza solo con el botón “Siguiente”.
 * - Pitidos: countdowns (prestart, trabajo con tiempo, descanso) tienen beeps cortos + largo al quedar 1s.
 * - Descanso: oculta imagen, muestra el siguiente ejercicio. El descanso del último ejercicio se omite.
 * - Fondo: azul trabajando, verde descansando.
 * - Progreso: barra global + barra del ejercicio si es por tiempo.
 */
