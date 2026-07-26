import "server-only";
import { GeminiAiProvider, GEMINI_DEFAULT_MODEL, GEMINI_DEFAULT_TIMEOUT_MS } from "@/lib/ai/gemini";
import { FakeAiProvider } from "@/lib/ai/fake";
import type { AiProvider } from "@/lib/ai/types";

export type AiProviderName = "gemini" | "fake";

export type AiRuntimeConfig = {
  provider: AiProviderName;
  geminiApiKey: string;
  model: string;
  timeoutMs: number;
};

/**
 * Read AI config from env. Secrets are never logged.
 * `AI_PROVIDER=fake` forces the fake adapter (tests / offline).
 * Default `gemini` — without GEMINI_API_KEY the adapter returns not_configured.
 */
export function readAiRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): AiRuntimeConfig {
  const raw = (env.AI_PROVIDER ?? "gemini").trim().toLowerCase();
  const provider: AiProviderName = raw === "fake" ? "fake" : "gemini";
  const timeoutRaw = Number(env.AI_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(timeoutRaw) && timeoutRaw > 0
      ? timeoutRaw
      : GEMINI_DEFAULT_TIMEOUT_MS;

  return {
    provider,
    geminiApiKey: env.GEMINI_API_KEY?.trim() ?? "",
    model: env.AI_MODEL?.trim() || GEMINI_DEFAULT_MODEL,
    timeoutMs,
  };
}

/** Build the configured AiProvider (call-site swap = change env only). */
export function createAiProvider(
  env: Record<string, string | undefined> = process.env,
  deps?: { fetchImpl?: typeof fetch },
): AiProvider {
  const cfg = readAiRuntimeConfig(env);
  if (cfg.provider === "fake") {
    return new FakeAiProvider(
      () => JSON.stringify({ ok: true, echo: "fake" }),
      cfg.model,
    );
  }
  return new GeminiAiProvider({
    apiKey: cfg.geminiApiKey,
    model: cfg.model,
    timeoutMs: cfg.timeoutMs,
    fetchImpl: deps?.fetchImpl,
  });
}

let cached: AiProvider | null = null;

/** Process-scoped provider singleton for Server Actions / routes. */
export function getAiProvider(): AiProvider {
  if (!cached) cached = createAiProvider();
  return cached;
}

/** Test helper — clears the singleton. */
export function resetAiProviderCache(): void {
  cached = null;
}
