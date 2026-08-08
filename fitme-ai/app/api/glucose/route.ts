import { NextResponse } from "next/server";
import {
  createGlucoseEntryAction,
  deleteGlucoseEntryAction,
  restoreGlucoseEntryAction,
  updateGlucoseEntryAction,
  type GlucoseActionResult,
  type GlucoseDeleteResult,
} from "@/app/actions/glucose";

/**
 * JSON glucose CRUD for the PWA.
 *
 * Server Actions abort when Origin ≠ Host (common on iOS standalone / proxies).
 * This route uses the same action logic with cookie session auth, without the
 * Next Action CSRF Origin/Host gate.
 */
export async function POST(request: Request) {
  return runGlucoseMutation(request, createGlucoseEntryAction);
}

export async function PATCH(request: Request) {
  return runGlucoseMutation(request, updateGlucoseEntryAction);
}

export async function DELETE(request: Request) {
  return runGlucoseMutation(request, deleteGlucoseEntryAction);
}

export async function PUT(request: Request) {
  return runGlucoseMutation(request, restoreGlucoseEntryAction);
}

async function runGlucoseMutation(
  request: Request,
  action: (input: unknown) => Promise<GlucoseActionResult | GlucoseDeleteResult>,
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await action(body);
  const status = result.ok
    ? 200
    : result.error.startsWith("Please sign in")
      ? 401
      : 400;

  return NextResponse.json(result, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
