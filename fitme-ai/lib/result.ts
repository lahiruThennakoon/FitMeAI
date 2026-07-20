/**
 * Uniform result envelope for Server Actions and DAL calls (AD-13).
 * Expected/handled errors are returned, not thrown, across the action boundary.
 */
export type FieldErrors = Record<string, string>;

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(error: string, fieldErrors?: FieldErrors): Result<never> {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}
