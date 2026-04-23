// public/sw.js — Kwentuhan service worker
const CACHE_NAME = "kwentuhan-v2";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/logo.png",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network-first for navigation, cache-first for assets
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/").then((r) => r ?? Response.error())
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached ?? fetch(event.request).then((res) => {
        if (res.ok && event.request.url.includes("/_next/static/")) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      })
    )
  );
});
