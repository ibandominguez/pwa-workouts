export type Exercise = {
  name: string;
  description: string;
  mediaUrl?: string;
  workingSeconds?: number; // Si existe => ejercicio por tiempo
  restingSeconds?: number; // Descanso DESPUÉS del ejercicio (se omite en el último)
  repetitionsCount?: number; // Si existe y no hay workingSeconds => por reps (sin tiempo)
};

export type Workout = {
  id: string;
  name: string;
  dificultyLevel: 1 | 2 | 3 | 4 | 5;
  exercises: Exercise[];
};

export type Phase = "work" | "rest";
export type Screen = "list" | "prestart" | "running" | "finished";
