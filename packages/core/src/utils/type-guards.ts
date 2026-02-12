/**
 * Type guards y validadores type-safe para el proyecto
 */

/**
 * Verifica si un valor está incluido en un array de forma type-safe
 * Elimina la necesidad de usar `as any` en validaciones
 */
export function isInArray<T>(
  value: unknown,
  array: readonly T[]
): value is T {
  return (array as readonly unknown[]).some((item) => item === value);
}

/**
 * Valida y retorna un valor si está en el array, sino retorna el valor por defecto
 */
export function validateOrDefault<T>(
  value: unknown,
  validValues: readonly T[],
  defaultValue: T
): T {
  return isInArray(value, validValues) ? value : defaultValue;
}
