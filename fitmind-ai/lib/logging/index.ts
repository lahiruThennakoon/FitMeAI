/**
 * Redacted structured logger (AD-9 / FR-31).
 * Health, body and PII values must never appear in logs or error messages.
 * We redact by key name and never log raw request/response bodies.
 */

const SENSITIVE_KEY = /(password|token|secret|email|weight|height|dob|birth|age|sex|body|calorie|nutri|health|measurement|photo|address|phone|name)/i;

export type LogLevel = "debug" | "info" | "warn" | "error";

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[Truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[Redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return "[Unloggable]";
}

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    ts: new Date().toISOString(),
    ...(meta ? { meta: redact(meta) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => emit("debug", m, meta),
  info: (m: string, meta?: Record<string, unknown>) => emit("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit("error", m, meta),
};
