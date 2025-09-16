import { create } from "zustand";
import { Workout, Phase, Screen } from "./types";
import { validateWorkout } from "./utils/workoutValidation";

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
  addWorkout: (workout: Workout) => void;
  removeWorkout: (id: string) => void;
};

const WORKOUTS_STORAGE_KEY = "workouts";

const loadStoredWorkouts = (): Workout[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WORKOUTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validWorkouts: Workout[] = [];
    for (const item of parsed) {
      const result = validateWorkout(item);
      if (result.ok) {
        validWorkouts.push(result.workout);
      }
    }
    return validWorkouts;
  } catch (error) {
    console.error("Error loading workouts from localStorage", error);
    return [];
  }
};

const persistWorkouts = (workouts: Workout[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      WORKOUTS_STORAGE_KEY,
      JSON.stringify(workouts),
    );
  } catch (error) {
    console.error("Error saving workouts to localStorage", error);
  }
};

const resetSelectionState = {
  screen: "list" as Screen,
  selectedWorkoutId: undefined,
  currentIndex: 0,
  phase: "work" as Phase,
  secondsLeft: 0,
  paused: false,
};

export const useStore = create<State>((set, get) => ({
  workouts: loadStoredWorkouts(),

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

  addWorkout: (workout) =>
    set((state) => {
      const workouts = [...state.workouts, workout];
      persistWorkouts(workouts);
      return { workouts };
    }),

  removeWorkout: (id) =>
    set((state) => {
      const workouts = state.workouts.filter((w) => w.id !== id);
      persistWorkouts(workouts);
      if (state.selectedWorkoutId === id) {
        return {
          workouts,
          ...resetSelectionState,
        };
      }
      return { workouts };
    }),
}));

