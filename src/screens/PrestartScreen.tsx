import React, { useMemo } from "react";
import { useStore } from "../store";

const PrestartScreen: React.FC = () => {
  const { workouts, selectedWorkoutId, secondsLeft, stopWorkout, setSecondsLeft } = useStore();

  const selectedWorkout = useMemo(
    () => workouts.find((w) => w.id === selectedWorkoutId),
    [workouts, selectedWorkoutId],
  );

  return (
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
          onClick={() => setSecondsLeft(1)}
          className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-3 font-semibold"
        >
          Saltar a inicio
        </button>
      </div>
    </div>
  );
};

export default PrestartScreen;
