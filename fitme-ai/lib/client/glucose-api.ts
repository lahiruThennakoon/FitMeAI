import type {
  GlucoseActionResult,
  GlucoseDeleteResult,
} from "@/app/actions/glucose";

/**
 * Cookie-authenticated glucose mutations via `/api/glucose`.
 * Prefer this over Server Actions on iOS standalone PWAs (Origin/Host CSRF).
 */
export async function postGlucoseCreate(
  body: unknown,
): Promise<GlucoseActionResult> {
  return glucoseJson("POST", body);
}

export async function patchGlucoseUpdate(
  body: unknown,
): Promise<GlucoseActionResult> {
  return glucoseJson("PATCH", body);
}

export async function deleteGlucoseReading(
  body: unknown,
): Promise<GlucoseDeleteResult> {
  return glucoseJson("DELETE", body);
}

export async function putGlucoseRestore(
  body: unknown,
): Promise<GlucoseDeleteResult> {
  return glucoseJson("PUT", body);
}

async function glucoseJson<T extends GlucoseActionResult | GlucoseDeleteResult>(
  method: string,
  body: unknown,
): Promise<T> {
  const response = await fetch("/api/glucose", {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Glucose API returned non-JSON (${response.status})`);
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("ok" in payload) ||
    typeof (payload as { ok: unknown }).ok !== "boolean"
  ) {
    throw new Error(`Glucose API returned unexpected payload (${response.status})`);
  }

  return payload as T;
}
