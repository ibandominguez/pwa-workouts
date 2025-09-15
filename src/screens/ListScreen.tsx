import React from "react";
import { useStore } from "../store";
import DifficultyDots from "../components/DifficultyDots";

const ListScreen: React.FC = () => {
  const { workouts, selectWorkout } = useStore();

  return (
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
};

export default ListScreen;
