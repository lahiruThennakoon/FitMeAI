import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FakeAiProvider } from "@/lib/ai/fake";
import { GeminiAiProvider } from "@/lib/ai/gemini";
import {
  createAiProvider,
  readAiRuntimeConfig,
  resetAiProviderCache,
} from "@/lib/ai/config";
import { structuredEchoSchema } from "@/lib/ai/schemas/structured-echo";
import type { AiProvider } from "@/lib/ai/types";

const echoInput = {
  purpose: "test_echo",
  userPrompt: "echo rice",
};

describe("FakeAiProvider", () => {
  it("validates handler JSON through Zod", async () => {
    const provider = new FakeAiProvider(() =>
      JSON.stringify({ ok: true, echo: "pol sambol" }),
    );
    const result = await provider.generateStructured(
      echoInput,
      structuredEchoSchema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.echo).toBe("pol sambol");
  });

  it("fails safe when handler returns invalid shape", async () => {
    const provider = new FakeAiProvider(() => JSON.stringify({ wrong: true }));
    const result = await provider.generateStructured(
      echoInput,
      structuredEchoSchema,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("validation_failed");
  });
});

describe("createAiProvider adapter swap (NFR-AIIndependence)", () => {
  beforeEach(() => resetAiProviderCache());
  afterEach(() => resetAiProviderCache());

  it("selects fake via AI_PROVIDER", () => {
    const provider = createAiProvider({ AI_PROVIDER: "fake" });
    expect(provider.id).toBe("fake");
  });

  it("defaults to gemini adapter", () => {
    const provider = createAiProvider({ AI_PROVIDER: "gemini", GEMINI_API_KEY: "k" });
    expect(provider.id).toBe("gemini");
  });

  it("call sites only need AiProvider — swap does not change invoke shape", async () => {
    async function callPort(provider: AiProvider) {
      return provider.generateStructured(echoInput, structuredEchoSchema);
    }

    const fake = new FakeAiProvider(() =>
      JSON.stringify({ ok: true, echo: "swapped" }),
    );
    const gemini = new GeminiAiProvider({
      apiKey: "test-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"ok":true,"echo":"from-gemini"}' }],
                },
              },
            ],
          }),
          { status: 200 },
        ),
    });

    const a = await callPort(fake);
    const b = await callPort(gemini);
    expect(a.ok && a.data.echo).toBe("swapped");
    expect(b.ok && b.data.echo).toBe("from-gemini");
  });

  it("reads timeout and model from env", () => {
    const cfg = readAiRuntimeConfig({
      AI_PROVIDER: "gemini",
      AI_MODEL: "gemini-test",
      AI_TIMEOUT_MS: "5000",
      GEMINI_API_KEY: "k",
    });
    expect(cfg.model).toBe("gemini-test");
    expect(cfg.timeoutMs).toBe(5000);
  });
});

describe("GeminiAiProvider", () => {
  it("returns not_configured without API key", async () => {
    const provider = new GeminiAiProvider({ apiKey: "" });
    const result = await provider.generateStructured(
      echoInput,
      structuredEchoSchema,
    );
    expect(result).toMatchObject({ ok: false, code: "not_configured" });
  });

  it("parses successful Gemini JSON payload", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '```json\n{"ok":true,"echo":"dhal"}\n```' }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const provider = new GeminiAiProvider({
      apiKey: "secret",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await provider.generateStructured(
      echoInput,
      structuredEchoSchema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.echo).toBe("dhal");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const init = call[1];
    expect(init.headers).toMatchObject({
      "x-goog-api-key": "secret",
    });
    const body = JSON.parse(String(init.body));
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("maps non-JSON HTTP 200 body to provider_error", async () => {
    const provider = new GeminiAiProvider({
      apiKey: "secret",
      fetchImpl: async () => new Response("not-json", { status: 200 }),
    });
    const result = await provider.generateStructured(
      echoInput,
      structuredEchoSchema,
    );
    expect(result).toMatchObject({ ok: false, code: "provider_error" });
  });

  it("maps HTTP errors to provider_error without leaking body", async () => {
    const provider = new GeminiAiProvider({
      apiKey: "secret",
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: { message: "quota blew up" } }), {
          status: 429,
        }),
    });
    const result = await provider.generateStructured(
      echoInput,
      structuredEchoSchema,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("provider_error");
      expect(result.error).not.toMatch(/quota/i);
    }
  });

  it("maps abort/timeout to safe timeout error", async () => {
    const provider = new GeminiAiProvider({
      apiKey: "secret",
      timeoutMs: 20,
      fetchImpl: async (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    });
    const result = await provider.generateStructured(
      echoInput,
      structuredEchoSchema,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["timeout", "aborted"]).toContain(result.code);
      expect(result.error).toMatch(/retry|manually|cancelled/i);
    }
  });
});
