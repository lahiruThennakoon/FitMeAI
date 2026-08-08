// FitMe AI service worker — Epic 4 offline instant-path (AD-12 / FR-16).

const SHELL_CACHE = "fitme-shell-v4";
const DATA_CACHE = "fitme-data-v2";
const SHELL = [
  "/",
  "/dashboard",
  "/log",
  "/exercise",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Cache-first for offline catalog (instant-path).
  if (url.pathname === "/api/offline/catalog") {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        try {
          const network = await fetch(event.request);
          if (network.ok) {
            cache.put(event.request, network.clone());
          }
          return network;
        } catch {
          const hit = await cache.match(event.request);
          if (hit) return hit;
          return new Response(JSON.stringify({ foods: [], recentSlugs: [] }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
      }),
    );
    return;
  }

  // Navigations: network, fall back to cached shell.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/log").then((r) => r || caches.match("/")),
      ),
    );
  }
});
