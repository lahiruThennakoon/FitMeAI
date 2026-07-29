/**
 * Diagnose AI provider connectivity (keys + TLS). Never prints secret values.
 * Usage: node scripts/check-ai.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

function loadEnvFile() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

const provider = (process.env.AI_PROVIDER ?? "gemini").trim().toLowerCase();
const model = process.env.AI_MODEL?.trim() || (provider === "openai" ? "gpt-4o-mini" : "gemini-2.0-flash");
const geminiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
const openaiKey = process.env.OPENAI_API_KEY?.trim() ?? "";

console.log("AI_PROVIDER:", provider);
console.log("AI_MODEL:", model);
console.log("GEMINI_API_KEY:", geminiKey ? `set (${geminiKey.length} chars)` : "missing");
console.log("OPENAI_API_KEY:", openaiKey ? `set (${openaiKey.length} chars)` : "missing");

if (provider === "fake") {
  console.log("\nOK: AI_PROVIDER=fake — parse uses the fake adapter (no outbound call).");
  process.exit(0);
}

async function probe(label, url, init) {
  try {
    const res = await fetch(url, init);
    const body = (await res.text()).slice(0, 200);
    console.log(`\n${label}: HTTP ${res.status}`);
    if (!res.ok) console.log(body);
    else console.log("OK — provider reachable");
    return res.ok;
  } catch (e) {
    const cause = e instanceof Error && "cause" in e ? e.cause : null;
    const code =
      cause && typeof cause === "object" && cause !== null && "code" in cause
        ? String(cause.code)
        : "";
    console.error(`\n${label}: FAILED — ${e instanceof Error ? e.message : e}`);
    if (code) console.error("cause:", code);
    if (code === "SELF_SIGNED_CERT_IN_CHAIN") {
      console.error(
        "\nCorporate TLS proxy detected. Fixes (dev only):\n" +
          "  1. Export your org root CA and set NODE_EXTRA_CA_CERTS=C:\\path\\to\\corp-ca.pem\n" +
          "  2. Or temporarily: NODE_TLS_REJECT_UNAUTHORIZED=0 (insecure — dev only)\n" +
          "  3. Or set AI_PROVIDER=fake for offline UI testing",
      );
    }
    return false;
  }
}

let ok = false;
if (provider === "openai") {
  if (!openaiKey) {
    console.error("\nERROR: AI_PROVIDER=openai but OPENAI_API_KEY is missing.");
    process.exit(1);
  }
  ok = await probe("OpenAI", "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Say ok" }],
      max_tokens: 5,
    }),
  });
} else {
  if (!geminiKey) {
    console.error("\nERROR: GEMINI_API_KEY is missing.");
    process.exit(1);
  }
  ok = await probe(
    "Gemini",
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say ok" }] }],
      }),
    },
  );
}

process.exit(ok ? 0 : 1);
