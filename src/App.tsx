import React, { useEffect, useMemo, useRef } from "react";
import { create } from "zustand";

// -----------------------------
// Tipos
// -----------------------------
type Dificulty = 1 | 2 | 3 | 4 | 5;

type Exercise = {
  name: string;
  description: string;
  mediaUrl?: string;
  workingSeconds?: number; // si existe -> ejercicio por tiempo
  restingSeconds?: number; // descanso tras el ejercicio (salvo último)
  repetitionsCount?: number; // si no hay workingSeconds -> por repeticiones
  seriesCount?: number; // repeticiones del ejercicio (por series)
};

type Workout = {
  id: string;
  name: string;
  dificultyLevel: Dificulty;
  seriesCount: number; // series del workout completo
  exercises: Exercise[];
};

type Step =
  | {
      kind: "work";
      workoutSeriesIndex: number; // 0-based
      exerciseIndex: number; // 0-based
      exerciseSeriesIndex: number; // 0-based
      title: string;
      description: string;
      mediaUrl?: string;
      duration?: number; // si timed
      reps?: number; // si por repeticiones
      isTimed: boolean;
    }
  | {
      kind: "rest";
      workoutSeriesIndex: number;
      exerciseIndex: number;
      exerciseSeriesIndex: number;
      title: "Descanso";
      duration: number;
    };

// -----------------------------
// Datos de ejemplo (cubre todas las casuísticas)
// -----------------------------
const WORKOUTS: Workout[] = [
  {
    id: "w1",
    name: "Full Body Rápido",
    dificultyLevel: 2,
    seriesCount: 1,
    exercises: [
      {
        name: "Jumping Jacks",
        description: "Calentamiento ligero para elevar pulsaciones.",
        mediaUrl:
          "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=1200&auto=format&fit=crop",
        workingSeconds: 30,
        restingSeconds: 15,
      },
      {
        name: "Sentadillas",
        description: "Pies al ancho de hombros, espalda recta.",
        mediaUrl:
          "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?q=80&w=1200&auto=format&fit=crop",
        repetitionsCount: 15,
        restingSeconds: 20,
        seriesCount: 2, // repetimos este ejercicio 2 veces (rep + descanso)
      },
      {
        name: "Plancha",
        description: "Activa core y glúteos, no hundas la cadera.",
        mediaUrl:
          "https://images.unsplash.com/photo-1575052814073-1686b50b4f87?q=80&w=1200&auto=format&fit=crop",
        workingSeconds: 40,
        restingSeconds: 0, // sin descanso después (último descanso no cuenta de todos modos)
      },
    ],
  },
  {
    id: "w2",
    name: "HIIT Corto",
    dificultyLevel: 4,
    seriesCount: 2, // el bloque entero se repite 2 veces
    exercises: [
      {
        name: "Burpees",
        description: "Explosivos, controla la técnica.",
        workingSeconds: 20,
        restingSeconds: 10,
      },
      {
        name: "Mountain Climbers",
        description: "Rodillas al pecho a ritmo vivo.",
        workingSeconds: 20,
        restingSeconds: 10,
      },
      {
        name: "Sprints Estáticos",
        description: "Corre en el sitio al máximo.",
        workingSeconds: 20,
        restingSeconds: 30,
      },
    ],
  },
  {
    id: "w3",
    name: "Fuerza Superior",
    dificultyLevel: 3,
    seriesCount: 1,
    exercises: [
      {
        name: "Flexiones",
        description: "Manos bajo hombros. Línea recta de cabeza a talones.",
        repetitionsCount: 12,
        restingSeconds: 30,
        seriesCount: 3,
      },
      {
        name: "Fondos en banco",
        description: "Codos atrás, baja controlado.",
        repetitionsCount: 10,
        restingSeconds: 30,
      },
      {
        name: "Plancha lateral",
        description: "Mantén la cadera alta.",
        workingSeconds: 30,
        restingSeconds: 15,
        seriesCount: 2,
      },
    ],
  },
];

// -----------------------------
// Audio: generador de pitidos
// -----------------------------
class Beeper {
  private ctx: AudioContext | null = null;

  private ensureCtx() {
    if (!this.ctx) {
      const AC =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
    }
  }

  beep({
    freq = 1000,
    durationMs = 140,
    type = "sine",
    volume = 0.2,
  }: {
    freq?: number;
    durationMs?: number;
    type?: OscillatorType;
    volume?: number;
  } = {}) {
    try {
      this.ensureCtx();
      const ctx = this.ctx!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type as OscillatorType;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch (_) {
      // Ignorar fallos de audio (autoplay policies, etc.)
    }
  }

  // Beep corto por defecto
  short() {
    this.beep({ freq: 1000, durationMs: 120, type: "square" });
  }
  // Beep largo de fin de TRABAJO (más agudo)
  longWorkEnd() {
    this.beep({ freq: 1400, durationMs: 550, type: "sawtooth", volume: 0.25 });
  }
  // Beep largo de fin de DESCANSO (más grave)
  longRestEnd() {
    this.beep({ freq: 700, durationMs: 550, type: "triangle", volume: 0.25 });
  }
}
const beeper = new Beeper();

// -----------------------------
// Utilidades
// -----------------------------
function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

function stars(n: Dificulty) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

// Construye la secuencia lineal de pasos (work/rest) con series (workout/exercise)
// y sin descanso final.
function buildSteps(workout: Workout): Step[] {
  const steps: Step[] = [];
  const wSeries = Math.max(1, workout.seriesCount ?? 1);

  for (let ws = 0; ws < wSeries; ws++) {
    workout.exercises.forEach((ex, ei) => {
      const eSeries = Math.max(1, ex.seriesCount ?? 1);
      for (let es = 0; es < eSeries; es++) {
        // Paso de trabajo
        const isTimed =
          typeof ex.workingSeconds === "number" && ex.workingSeconds > 0;
        steps.push({
          kind: "work",
          workoutSeriesIndex: ws,
          exerciseIndex: ei,
          exerciseSeriesIndex: es,
          title: ex.name,
          description: ex.description,
          mediaUrl: ex.mediaUrl,
          duration: isTimed ? ex.workingSeconds : undefined,
          reps: !isTimed ? (ex.repetitionsCount ?? 10) : undefined,
          isTimed,
        });

        // ¿Añadimos descanso?
        const isLastExercise =
          ei === workout.exercises.length - 1 && es === eSeries - 1;
        const isLastWorkoutSeries = ws === wSeries - 1;
        const shouldSkipRest = isLastExercise && isLastWorkoutSeries; // último descanso no se cuenta

        const restDur = Math.max(0, ex.restingSeconds ?? 0);

        if (!shouldSkipRest && restDur > 0) {
          steps.push({
            kind: "rest",
            workoutSeriesIndex: ws,
            exerciseIndex: ei,
            exerciseSeriesIndex: es,
            title: "Descanso",
            duration: restDur,
          });
        }
      }
    });
  }
  return steps;
}

// Estima duración total sólo con partes cronometradas (para el listado)
function estimateTotalSeconds(workout: Workout): number {
  const steps = buildSteps(workout);
  return steps.reduce(
    (acc, s) =>
      acc +
      (s.kind === "work" && s.isTimed ? (s.duration ?? 0) : 0) +
      (s.kind === "rest" ? s.duration : 0),
    0,
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// -----------------------------
// Zustand Store
// -----------------------------
type Phase = "list" | "pre" | "work" | "rest" | "done";

type AppState = {
  workouts: Workout[];
  selectedWorkoutId?: string;
  phase: Phase;

  // Pre-countdown (5s)
  preRemaining: number;

  // Secuencia lineal del workout seleccionado
  steps: Step[];
  currentIndex: number;

  // Temporizador del paso actual (si procede)
  remaining: number; // segundos restantes del paso actual (solo si timed)
  isPaused: boolean;

  selectWorkout: (id: string) => void;
  cancelToList: () => void;
  startAfterPre: () => void;
  nextStep: () => void;
  tick: () => void;
  togglePause: () => void;
};

const useAppStore = create<AppState>((set, get) => ({
  workouts: WORKOUTS,
  selectedWorkoutId: undefined,
  phase: "list",
  preRemaining: 5,
  steps: [],
  currentIndex: 0,
  remaining: 0,
  isPaused: false,

  selectWorkout: (id) => {
    const workout = WORKOUTS.find((w) => w.id === id);
    if (!workout) return;
    const steps = buildSteps(workout);
    set({
      selectedWorkoutId: id,
      phase: "pre",
      preRemaining: 5,
      steps,
      currentIndex: 0,
      remaining: 0,
      isPaused: false,
    });
  },

  cancelToList: () =>
    set({
      phase: "list",
      selectedWorkoutId: undefined,
      steps: [],
      currentIndex: 0,
      remaining: 0,
      preRemaining: 5,
      isPaused: false,
    }),

  startAfterPre: () => {
    const { steps } = get();
    if (steps.length === 0) {
      set({ phase: "done" });
      return;
    }
    const step = steps[0];
    set({
      phase: step.kind,
      remaining:
        step.kind === "work" && step.isTimed
          ? (step.duration ?? 0)
          : step.kind === "rest"
            ? step.duration
            : 0,
    });
  },

  nextStep: () => {
    const { currentIndex, steps } = get();
    const nextIdx = currentIndex + 1;
    if (nextIdx >= steps.length) {
      set({ phase: "done" });
      return;
    }
    const next = steps[nextIdx];
    set({
      currentIndex: nextIdx,
      phase: next.kind,
      remaining:
        next.kind === "work" && next.isTimed
          ? (next.duration ?? 0)
          : next.kind === "rest"
            ? next.duration
            : 0,
    });
  },

  tick: () => {
    const { phase, preRemaining, remaining, isPaused } = get();
    if (isPaused) return;

    if (phase === "pre") {
      // beep cada segundo, largo cuando pase a 1
      if (preRemaining <= 5 && preRemaining > 1) {
        beeper.short();
      } else if (preRemaining === 1) {
        beeper.longWorkEnd();
      }
      if (preRemaining <= 1) {
        set({ preRemaining: 0 });
        get().startAfterPre();
      } else {
        set({ preRemaining: preRemaining - 1 });
      }
      return;
    }

    if (phase === "work" || phase === "rest") {
      if (remaining > 0) {
        // Pitido por segundo cuando hay tiempo
        if (remaining > 1 && remaining <= 5) {
          // en los últimos 5 segundos sigue pitando corto
          beeper.short();
        } else if (remaining === 1) {
          const method =
            phase === "work" ? beeper.longWorkEnd : beeper.longRestEnd;
          method();
        }
        set({ remaining: remaining - 1 });
      } else {
        // TODO: Solo pasar si el ejercicio tiene tiempo
        get().nextStep();
      }
    }
  },

  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
}));

// -----------------------------
// Hook de intervalo 1s
// -----------------------------
function useOneSecondTicker() {
  const tick = useAppStore((s) => s.tick);
  useEffect(() => {
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [tick]);
}

// -----------------------------
// UI Components (en el mismo archivo para facilitar copy-paste)
// -----------------------------

function WorkoutList() {
  const workouts = useAppStore((s) => s.workouts);
  const selectWorkout = useAppStore((s) => s.selectWorkout);

  return (
    <div className="max-w-md mx-auto p-4 space-y-3">
      <h1 className="text-2xl font-bold">Workouts</h1>
      <div className="grid grid-cols-1 gap-3">
        {workouts.map((w) => {
          const est = estimateTotalSeconds(w);
          const stepsCount = buildSteps(w).length;
          return (
            <button
              key={w.id}
              onClick={() => selectWorkout(w.id)}
              className="text-left rounded-2xl p-4 shadow hover:shadow-md bg-white border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{w.name}</div>
                <div className="text-yellow-500">
                  {stars(w.dificultyLevel as Dificulty)}
                </div>
              </div>
              <div className="text-sm text-slate-500 mt-1">
                {w.exercises.length} ejercicios · {stepsCount} pasos · ~
                {formatTime(est)}
              </div>
              {w.seriesCount > 1 && (
                <div className="text-xs text-slate-500 mt-1">
                  Series del workout: x{w.seriesCount}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Consejo: activa el sonido del móvil para los pitidos ⏱️🔊
      </p>
    </div>
  );
}

function PreCountdown() {
  const pre = useAppStore((s) => s.preRemaining);
  const cancel = useAppStore((s) => s.cancelToList);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="rounded-3xl bg-slate-800 p-6 shadow-lg text-center">
          <div className="text-slate-300 mb-2">Prepárate</div>
          <div className="text-7xl font-black leading-none">{pre}</div>
          <div className="mt-4 text-sm text-slate-300">
            Comenzamos cuando llegue a 0 (pitido largo).
          </div>
          <button
            onClick={cancel}
            className="mt-6 w-full rounded-xl bg-slate-700 py-3 font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-3 bg-white/30 rounded-full overflow-hidden">
      <div
        className="h-full bg-white/90"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function CurrentStepCard() {
  const steps = useAppStore((s) => s.steps);
  const idx = useAppStore((s) => s.currentIndex);
  const step = steps[idx] as Step | undefined;

  const nextStep = useAppStore((s) => s.nextStep);
  const togglePause = useAppStore((s) => s.togglePause);
  const cancel = useAppStore((s) => s.cancelToList);

  const remaining = useAppStore((s) => s.remaining);
  const isPaused = useAppStore((s) => s.isPaused);

  // Global progress
  const globalProgress = useMemo(() => {
    if (steps.length === 0) return 0;
    const current = steps[idx];
    let frac = 0;
    if (
      current?.kind === "work" &&
      current.isTimed &&
      current.duration &&
      current.duration > 0
    ) {
      frac = (current.duration - remaining) / current.duration;
    } else if (current?.kind === "rest" && current.duration > 0) {
      frac = (current.duration - remaining) / current.duration;
    } else {
      frac = 0; // por reps, sin subprogreso
    }
    const value = ((idx + frac) / steps.length) * 100;
    return Math.max(0, Math.min(100, value));
  }, [steps, idx, remaining]);

  if (!step) return null;

  const isWork = step.kind === "work";
  const bg = isWork ? "bg-blue-600" : "bg-green-600";
  const bgSoft = isWork ? "bg-blue-500" : "bg-green-500";
  const showTimer =
    (isWork && step.isTimed && typeof step.duration === "number") ||
    (!isWork && typeof step.duration === "number");

  const currentTimerTotal =
    isWork && step.isTimed ? (step.duration ?? 0) : !isWork ? step.duration : 0;

  const currentTimerProgress =
    showTimer && currentTimerTotal && currentTimerTotal > 0
      ? ((currentTimerTotal - remaining) / currentTimerTotal) * 100
      : 0;

  const headerLabel = isWork ? "Trabajando" : "Descanso";

  return (
    <div className={`min-h-screen ${bg} text-white flex flex-col p-4`}>
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col gap-4">
        {/* Progreso global */}
        <div className="pt-2">
          <ProgressBar value={globalProgress} />
        </div>

        {/* Tarjeta principal */}
        <div className="rounded-3xl bg-white/10 backdrop-blur p-4 shadow-lg flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wide text-white/80 text-xs">
              {headerLabel}
            </span>
            <button
              onClick={togglePause}
              className="text-xs bg-white/20 px-3 py-1 rounded-full"
            >
              {isPaused ? "Reanudar" : "Pausar"}
            </button>
          </div>

          {/* Media / Descanso */}
          <div className="mt-3 rounded-2xl overflow-hidden bg-black/20 aspect-[16/10] flex items-center justify-center">
            {isWork ? (
              (step as Extract<Step, { kind: "work" }>).mediaUrl ? (
                <img
                  src={(step as Extract<Step, { kind: "work" }>).mediaUrl}
                  alt={(step as Extract<Step, { kind: "work" }>).title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-white/70 text-sm">Sin imagen</div>
              )
            ) : (
              <div className="text-3xl font-bold">DESCANSO</div>
            )}
          </div>

          {/* Título y descripción */}
          <div className="mt-4">
            <div className="text-xl font-bold leading-tight">
              {isWork ? step.title : "Descanso"}
            </div>
            <div className="text-white/80 text-sm mt-1">
              {isWork
                ? (step as any).description
                : "Respira y prepárate para el siguiente ejercicio."}
            </div>
          </div>

          {/* Controles / Info */}
          <div className="mt-auto">
            {isWork && !step.isTimed ? (
              // Ejercicio por repeticiones
              <div className="space-y-3">
                <div className="text-5xl font-black text-center">
                  {step.reps ?? 0} reps
                </div>
                <button
                  onClick={nextStep}
                  className={`w-full ${bgSoft} py-3 rounded-xl font-semibold`}
                >
                  Siguiente
                </button>
              </div>
            ) : (
              // Temporizador (work o rest)
              <div className="space-y-3">
                <div className="text-6xl font-black text-center tabular-nums">
                  {formatTime(remaining)}
                </div>
                <ProgressBar value={currentTimerProgress} />
              </div>
            )}

            {/* Indicadores de series/posición */}
            <StepBreadcrumb />
          </div>

          {/* Cancelar */}
          <button
            onClick={cancel}
            className="mt-4 w-full rounded-xl bg-white/15 py-3 font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function StepBreadcrumb() {
  const steps = useAppStore((s) => s.steps);
  const idx = useAppStore((s) => s.currentIndex);

  if (steps.length === 0) return null;

  const step = steps[idx];

  // Totales para mostrar contexto
  const totalSteps = steps.length;

  // Buscar el workout real para contar series totales del workout y del ejercicio
  const workout = useAppStore((s) =>
    s.workouts.find((w) => w.id === s.selectedWorkoutId),
  );

  const ex = workout?.exercises[step.exerciseIndex];
  const exSeriesTotal = Math.max(1, ex?.seriesCount ?? 1);
  const wSeriesTotal = Math.max(1, workout?.seriesCount ?? 1);

  return (
    <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-white/80">
      <div className="rounded-lg bg-white/10 p-2">
        <div className="uppercase opacity-80">Paso</div>
        <div className="font-semibold">
          {idx + 1}/{totalSteps}
        </div>
      </div>
      <div className="rounded-lg bg-white/10 p-2">
        <div className="uppercase opacity-80">Serie ej.</div>
        <div className="font-semibold">
          {step.exerciseSeriesIndex + 1}/{exSeriesTotal}
        </div>
      </div>
      <div className="rounded-lg bg-white/10 p-2">
        <div className="uppercase opacity-80">Serie W.</div>
        <div className="font-semibold">
          {step.workoutSeriesIndex + 1}/{wSeriesTotal}
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Pantalla DONE
// -----------------------------
function DoneScreen() {
  const cancel = useAppStore((s) => s.cancelToList);
  const workout = useAppStore((s) =>
    s.workouts.find((w) => w.id === s.selectedWorkoutId),
  );
  useEffect(() => {
    // Un último beep de celebración
    beeper.beep({ freq: 1600, durationMs: 250, type: "square", volume: 0.25 });
    setTimeout(
      () =>
        beeper.beep({
          freq: 900,
          durationMs: 250,
          type: "square",
          volume: 0.25,
        }),
      300,
    );
    setTimeout(
      () =>
        beeper.beep({
          freq: 1600,
          durationMs: 250,
          type: "square",
          volume: 0.25,
        }),
      600,
    );
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl bg-slate-800 p-6 text-center shadow-lg">
        <div className="text-sm text-slate-300">¡Completado!</div>
        <div className="text-2xl font-bold mt-1">{workout?.name}</div>
        <div className="mt-4 text-sm text-slate-300">
          Buen trabajo. Hidrátate y estira un poco.
        </div>
        <button
          onClick={cancel}
          className="mt-6 w-full rounded-xl bg-white/15 py-3 font-semibold"
        >
          Volver al listado
        </button>
      </div>
    </div>
  );
}

// -----------------------------
// App (root component)
// -----------------------------
export default function App() {
  const phase = useAppStore((s) => s.phase);
  const selected = useAppStore((s) => s.selectedWorkoutId);
  const steps = useAppStore((s) => s.steps);
  const currentIndex = useAppStore((s) => s.currentIndex);
  const startAfterPre = useAppStore((s) => s.startAfterPre);

  useOneSecondTicker();

  // Arranque automático del primer paso tras el pre-countdown (por si el usuario vuelve al tab)
  const bootOnceRef = useRef(false);
  useEffect(() => {
    if (phase === "pre" || bootOnceRef.current) return;
    if (
      phase === "work" ||
      phase === "rest" ||
      phase === "done" ||
      phase === "list"
    )
      return;
    bootOnceRef.current = true;
    startAfterPre();
  }, [phase, startAfterPre]);

  // Accesible: anuncia cambios de paso
  useEffect(() => {
    if (!steps.length) return;
    const cur = steps[currentIndex];
    document.title =
      phase === "list"
        ? "Workout"
        : cur.kind === "work"
          ? `▶️ ${cur.title}`
          : "⏸️ Descanso";
  }, [steps, currentIndex, phase]);

  if (phase === "list") return <WorkoutList />;
  if (phase === "pre") return <PreCountdown />;
  if (phase === "done") return <DoneScreen />;
  // work/rest
  return <CurrentStepCard />;
}
