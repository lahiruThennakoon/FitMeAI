/**
 * Redacted structured logger (AD-9 / FR-31).
 * Health, body and PII values must never appear in logs or error messages.
 * We redact by key name and never log raw request/response bodies or Error.message.
 */

const SENSITIVE_KEY =
  /(password|token|secret|authorization|cookie|email|weight|height|dob|birth|age|sex|body|calorie|nutri|health|measurement|photo|address|phone|name|apikey|api_key|message|detail|reason|^error$|err)/i;

export type LogLevel = "debug" | "info" | "warn" | "error";

function isErrorLike(
  value: unknown,
): value is { name?: unknown; message?: unknown } {
  if (value instanceof Error) return true;
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return typeof o.message === "string" && ("name" in o || "code" in o || "status" in o);
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[Truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (isErrorLike(value)) {
    // Better Auth / runtime errors may embed emails in `.message` — never emit raw.
    return {
      name: typeof value.name === "string" ? value.name : "Error",
      message: "[Redacted]",
    };
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
