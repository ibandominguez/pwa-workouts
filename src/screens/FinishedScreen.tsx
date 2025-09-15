import React, { useMemo } from "react";
import { useStore } from "../store";

const FinishedScreen: React.FC = () => {
  const { workouts, selectedWorkoutId, goHome } = useStore();

  const selectedWorkout = useMemo(
    () => workouts.find((w) => w.id === selectedWorkoutId),
    [workouts, selectedWorkoutId],
  );

  return (
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
};

export default FinishedScreen;
