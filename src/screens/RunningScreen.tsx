import React, { useMemo } from "react";
import { useStore } from "../store";
import { fmt } from "../utils/time";

const RunningScreen: React.FC = () => {
  const {
    workouts,
    selectedWorkoutId,
    currentIndex,
    phase,
    secondsLeft,
    paused,
    nextStepForReps,
    togglePause,
    stopWorkout,
  } = useStore();

  const selectedWorkout = useMemo(
    () => workouts.find((w) => w.id === selectedWorkoutId),
    [workouts, selectedWorkoutId],
  );

  const ex = selectedWorkout?.exercises[currentIndex];
  const isTimeExercise = !!ex?.workingSeconds;
  const totalExercises = selectedWorkout?.exercises.length ?? 0;

  const globalProgress = useMemo(() => {
    if (!selectedWorkout) return 0;
    const base = currentIndex / selectedWorkout.exercises.length;
    if (phase === "work" && isTimeExercise && ex?.workingSeconds) {
      const done = ex.workingSeconds - secondsLeft;
      const frac = Math.min(1, Math.max(0, done / ex.workingSeconds));
      return Math.min(1, base + frac / selectedWorkout.exercises.length);
    }
    return base;
  }, [selectedWorkout, currentIndex, phase, ex, isTimeExercise, secondsLeft]);

  const workoutBg = phase === "rest" ? "bg-green-600" : "bg-blue-600";

  return (
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
                  onClick={togglePause}
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
};

export default RunningScreen;
