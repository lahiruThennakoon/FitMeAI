// FitMe AI service worker — baseline (Story 1.1).
// The offline instant-path cache + reconcile logic lands in Epic 4 (AD-12).
// For now this establishes an installable, controllable SW with a passthrough
// fetch handler and lifecycle hooks ready to extend.

const CACHE = "fitme-shell-v1";
const SHELL = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Passthrough for now; Epic 4 adds cache-first for the food instant-path.
  if (event.request.method !== "GET") return;
});
