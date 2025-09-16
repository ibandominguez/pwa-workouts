import { Exercise, Workout } from "../types";

export type WorkoutValidationResult =
  | { ok: true; workout: Workout }
  | { ok: false; error: string };

type ExerciseValidationResult =
  | { ok: true; workout: Exercise }
  | { ok: false; error: string };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const allowedLevels = new Set([1, 2, 3, 4, 5]);

const sanitizeExercise = (
  input: unknown,
  index: number,
): ExerciseValidationResult => {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: `El ejercicio #${index + 1} debe ser un objeto.` };
  }

  const record = input as Record<string, unknown>;
  const { name, description, mediaUrl, workingSeconds, restingSeconds, repetitionsCount } = record;

  if (!isNonEmptyString(name)) {
    return {
      ok: false,
      error: `El ejercicio #${index + 1} debe tener un "name" de tipo string no vacío.`,
    };
  }

  if (!isNonEmptyString(description)) {
    return {
      ok: false,
      error: `El ejercicio #${index + 1} debe tener una "description" de tipo string no vacía.`,
    };
  }

  const exercise: Exercise = {
    name: name.trim(),
    description: description.trim(),
  };

  if (mediaUrl !== undefined) {
    if (!isNonEmptyString(mediaUrl)) {
      return {
        ok: false,
        error: `El ejercicio #${index + 1} tiene un "mediaUrl" inválido. Debe ser un string.`,
      };
    }
    exercise.mediaUrl = mediaUrl.trim();
  }

  if (workingSeconds !== undefined) {
    if (!isPositiveInteger(workingSeconds)) {
      return {
        ok: false,
        error: `El ejercicio #${index + 1} tiene "workingSeconds" inválido. Debe ser un número entero positivo.`,
      };
    }
    exercise.workingSeconds = workingSeconds;
  }

  if (restingSeconds !== undefined) {
    if (!isNonNegativeInteger(restingSeconds)) {
      return {
        ok: false,
        error: `El ejercicio #${index + 1} tiene "restingSeconds" inválido. Debe ser un número entero mayor o igual que 0.`,
      };
    }
    exercise.restingSeconds = restingSeconds;
  }

  if (repetitionsCount !== undefined) {
    if (!isPositiveInteger(repetitionsCount)) {
      return {
        ok: false,
        error: `El ejercicio #${index + 1} tiene "repetitionsCount" inválido. Debe ser un número entero positivo.`,
      };
    }
    exercise.repetitionsCount = repetitionsCount;
  }

  return { ok: true, workout: exercise };
};

export const validateWorkout = (input: unknown): WorkoutValidationResult => {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "El JSON debe representar un objeto." };
  }

  const record = input as Record<string, unknown>;
  const { id, name, dificultyLevel, exercises } = record;

  if (!isNonEmptyString(id)) {
    return { ok: false, error: 'El campo "id" debe ser un string no vacío.' };
  }

  if (!isNonEmptyString(name)) {
    return { ok: false, error: 'El campo "name" debe ser un string no vacío.' };
  }

  if (typeof dificultyLevel !== "number" || !allowedLevels.has(dificultyLevel)) {
    return {
      ok: false,
      error: 'El campo "dificultyLevel" debe ser un número entero entre 1 y 5.',
    };
  }

  if (!Array.isArray(exercises) || exercises.length === 0) {
    return {
      ok: false,
      error: 'El campo "exercises" debe ser un array con al menos un ejercicio.',
    };
  }

  const normalizedExercises: Exercise[] = [];
  for (let i = 0; i < exercises.length; i += 1) {
    const result = sanitizeExercise(exercises[i], i);
    if (!result.ok) {
      return result;
    }
    normalizedExercises.push(result.workout);
  }

  const workout: Workout = {
    id: (id as string).trim(),
    name: (name as string).trim(),
    dificultyLevel: dificultyLevel as Workout["dificultyLevel"],
    exercises: normalizedExercises,
  };

  return { ok: true, workout };
};

export const parseWorkoutJson = (text: string): WorkoutValidationResult => {
  try {
    const data = JSON.parse(text);
    return validateWorkout(data);
  } catch {
    return { ok: false, error: "El texto no es un JSON válido." };
  }
};
