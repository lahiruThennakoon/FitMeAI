import { NextResponse, type NextRequest } from "next/server";
import { authApiRateLimitResponse } from "@/lib/rate-limit/http";
import { logger } from "@/lib/logging";

/**
 * Defense-in-depth rate limit for Better Auth HTTP surface (Story 1.8 / FR-30).
 * Auth Server Actions are limited separately (in-process calls bypass this).
 */
export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  const limited = authApiRateLimitResponse(request);
  if (limited) {
    logger.warn("auth.rate_limited", {
      outcome: "rate_limited",
      surface: "api_auth",
    });
    return limited;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*"],
};
