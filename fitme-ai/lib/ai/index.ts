export type {
  AiFailure,
  AiFailureCode,
  AiProvider,
  AiResult,
  AiSuccess,
  GenerateStructuredInput,
  GenerateStructuredOptions,
} from "@/lib/ai/types";
export { AI_SAFE_ERRORS } from "@/lib/ai/types";
export { extractJsonText, parseAndValidate } from "@/lib/ai/parse";
export { purposeForLog } from "@/lib/ai/log-meta";
export {
  createAiProvider,
  getAiProvider,
  readAiRuntimeConfig,
  resetAiProviderCache,
} from "@/lib/ai/config";
export { GeminiAiProvider, GEMINI_DEFAULT_MODEL, GEMINI_DEFAULT_TIMEOUT_MS } from "@/lib/ai/gemini";
export { OpenAiProvider, OPENAI_DEFAULT_MODEL, OPENAI_DEFAULT_TIMEOUT_MS } from "@/lib/ai/openai";
export { FakeAiProvider } from "@/lib/ai/fake";
export {
  structuredEchoSchema,
  structuredEchoResponseSchema,
  type StructuredEcho,
} from "@/lib/ai/schemas/structured-echo";
export {
  foodParseAiSchema,
  foodParseResponseSchema,
  FOOD_PARSE_SYSTEM,
  type FoodParseAiOutput,
} from "@/lib/ai/schemas/food-parse";
