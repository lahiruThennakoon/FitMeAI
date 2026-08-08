import type { NextConfig } from "next";

// Defense-in-depth security headers (NFR-Sec / OWASP). CSP is intentionally
// conservative here and will be tightened as feature surfaces are added.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/**
 * Hostnames allowed for Server Action Origin/Host CSRF checks.
 * iOS standalone PWAs + reverse proxies often send Origin that differs from
 * Host/X-Forwarded-Host (or Origin: null); without this, actions abort and
 * the client only sees a generic save failure.
 *
 * `"null"` is required for opaque origins (some iOS home-screen PWAs).
 * Prefer SameSite session cookies so allowlisting null stays CSRF-safe.
 */
function serverActionAllowedOrigins(): string[] {
  const hosts = new Set<string>(["localhost:3000", "null"]);

  for (const raw of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    if (!raw) continue;
    try {
      const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
      if (url.host) hosts.add(url.host);
    } catch {
      // ignore malformed env values
    }
  }

  for (const extra of (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "").split(
    ",",
  )) {
    const host = extra.trim();
    if (host) hosts.add(host);
  }

  return [...hosts];
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: serverActionAllowedOrigins(),
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
