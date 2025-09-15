import { create } from "zustand";
import workoutsData from "./workouts.json";
import { Workout, Phase, Screen } from "./types";

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

export const useStore = create<State>((set, get) => ({
  workouts: workoutsData as Workout[],

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

