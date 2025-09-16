import React, { useMemo, useState } from "react";
import { useStore } from "../store";
import DifficultyDots from "../components/DifficultyDots";
import { parseWorkoutJson } from "../utils/workoutValidation";

const ListScreen: React.FC = () => {
  const workouts = useStore((state) => state.workouts);
  const selectWorkout = useStore((state) => state.selectWorkout);
  const addWorkout = useStore((state) => state.addWorkout);
  const removeWorkout = useStore((state) => state.removeWorkout);
  const [showForm, setShowForm] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const workoutCountLabel = useMemo(() => {
    if (workouts.length === 0) return "No hay workouts guardados";
    if (workouts.length === 1) return "1 workout guardado";
    return `${workouts.length} workouts guardados`;
  }, [workouts.length]);

  const handleToggleForm = () => {
    setShowForm((prev) => {
      const next = !prev;
      if (!next) {
        setJsonInput("");
        setError(null);
      }
      return next;
    });
  };

  const handleAddWorkout = () => {
    const text = jsonInput.trim();
    if (!text) {
      setError("Introduce un JSON para añadir un workout.");
      return;
    }

    const result = parseWorkoutJson(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (workouts.some((w) => w.id === result.workout.id)) {
      setError(`Ya existe un workout con el id "${result.workout.id}".`);
      return;
    }

    addWorkout(result.workout);
    setJsonInput("");
    setError(null);
    setShowForm(false);
  };

  const handleRemoveWorkout = (id: string, name: string) => {
    if (typeof window !== "undefined") {
      const confirmation = window.confirm(
        `¿Seguro que quieres eliminar "${name}"? Esta acción no se puede deshacer.`,
      );
      if (!confirmation) return;
    }
    removeWorkout(id);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">🏋️ Workout</h1>
        <button
          type="button"
          onClick={handleToggleForm}
          className="rounded-lg border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          {showForm ? "Cerrar" : "Añadir"}
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-2">{workoutCountLabel}</p>
      <p className="text-sm text-gray-600 mb-4">
        Elige un <strong>workout</strong> para comenzar. Al pulsar verás un
        countdown de 5s con pitidos. En el último segundo, sonará un pitido
        largo de inicio.
      </p>
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-base font-semibold mb-2">Añadir workout</h2>
          <p className="text-xs text-gray-500 mb-2">
            Pega un JSON con la estructura del workout. Debe cumplir la interfaz
            indicada en la descripción.
          </p>
          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              if (error) setError(null);
            }}
            className="h-40 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm font-mono outline-none focus:ring-2 focus:ring-gray-300"
            placeholder='{"id":"id-unico","name":"Nombre","dificultyLevel":3,"exercises":[{"name":"Ejercicio","description":"Descripción"}]}'
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddWorkout}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 active:bg-gray-700"
            >
              Guardar workout
            </button>
            <button
              type="button"
              onClick={handleToggleForm}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {workouts.length === 0 && (
        <p className="text-sm text-gray-500">
          Añade tu primer workout usando el botón «Añadir».
        </p>
      )}
      <div className="space-y-3">
        {workouts.map((w) => (
          <div
            key={w.id}
            className="w-full rounded-xl border border-gray-200 p-4 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => selectWorkout(w.id)}
                className="flex-1 text-left"
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
              <button
                type="button"
                onClick={() => handleRemoveWorkout(w.id, w.name)}
                className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListScreen;
