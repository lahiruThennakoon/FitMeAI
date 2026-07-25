/**
 * Derive a stable client key for rate limiting (IP-ish).
 * Prefer platform-set headers over client-spoofable X-Forwarded-For.
 * Never log this value as if it were identity — use only as a throttle key.
 */

function firstHeaderValue(headerBag: Headers, name: string): string | null {
  const raw = headerBag.get(name)?.trim();
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  return first || null;
}

export function clientKeyFromHeaders(headerBag: Headers): string {
  // Platform / reverse-proxy identities first (harder for clients to forge).
  const platformIp =
    firstHeaderValue(headerBag, "x-vercel-forwarded-for") ??
    firstHeaderValue(headerBag, "cf-connecting-ip") ??
    firstHeaderValue(headerBag, "x-real-ip");
  if (platformIp) return `ip:${platformIp}`;

  // Last resort: XFF (may be client-controlled without a trusted proxy).
  const forwarded = firstHeaderValue(headerBag, "x-forwarded-for");
  if (forwarded) return `ip:${forwarded}`;

  return "ip:unknown";
}
