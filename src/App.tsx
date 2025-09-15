import React, { useEffect, useMemo, useRef } from "react";
import { useStore } from "./store";
import { useKeepAwake } from "./hooks/useKeepAwake";
import { useBeep } from "./hooks/useBeep";
import ListScreen from "./screens/ListScreen";
import PrestartScreen from "./screens/PrestartScreen";
import RunningScreen from "./screens/RunningScreen";
import FinishedScreen from "./screens/FinishedScreen";

const App: React.FC = () => {
  const {
    workouts,
    screen,
    selectedWorkoutId,
    currentIndex,
    phase,
    secondsLeft,
    paused,
    startWorkout,
    tick,
  } = useStore();

  const selectedWorkout = useMemo(
    () => workouts.find((w) => w.id === selectedWorkoutId),
    [workouts, selectedWorkoutId],
  );

  const { tickBeep, longBeep } = useBeep();
  const screenLock = useKeepAwake();

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
    // Gestionar Screen Wake Lock
    if (phase === "work") screenLock.request();
    else screenLock.release();

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
  }, [screen, secondsLeft, phase, currentIndex, selectedWorkout, screenLock]);

  return (
    <div className="min-h-[100dvh] bg-white">
      {screen === "list" && <ListScreen />}
      {screen === "prestart" && <PrestartScreen />}
      {screen === "running" && <RunningScreen />}
      {screen === "finished" && <FinishedScreen />}
    </div>
  );
};

export default App;
