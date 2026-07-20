import { NextResponse } from "next/server";
import { serverEnvStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe. Reports env completeness by *name* only — never the
 * secret values themselves (FR-31 / AD-9).
 */
export async function GET() {
  const env = serverEnvStatus();
  return NextResponse.json(
    {
      status: env.ok ? "ok" : "degraded",
      service: "fitme-ai",
      time: new Date().toISOString(),
      env: { ok: env.ok, missing: env.missing },
    },
    { status: env.ok ? 200 : 503 },
  );
}
