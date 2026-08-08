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
 * Host/X-Forwarded-Host; without this, actions abort and the client only
 * sees a generic save failure.
 */
function serverActionAllowedOrigins(): string[] {
  const hosts = new Set<string>(["localhost:3000"]);

  for (const raw of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL,
  ]) {
    if (!raw) continue;
    try {
      const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
      if (url.host) hosts.add(url.host);
    } catch {
      // ignore malformed env values
    }
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
