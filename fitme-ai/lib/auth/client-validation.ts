import type { ZodType } from "zod";
import { fieldErrorsFromZod } from "@/lib/auth/actions-shared";

/**
 * Run the same Zod schema used by server actions for immediate client feedback.
 */
export function clientFieldErrors<T extends Record<string, unknown>>(
  schema: ZodType<T>,
  input: unknown,
): Partial<Record<keyof T & string, string>> | null {
  const parsed = schema.safeParse(input);
  if (parsed.success) return null;
  return fieldErrorsFromZod(parsed.error) as Partial<
    Record<keyof T & string, string>
  >;
}
