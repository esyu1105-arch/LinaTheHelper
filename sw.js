// sw.js — Service Worker for Lina Daily Tasks PWA
const CACHE_NAME = 'lina-tasks-v1';

// Core assets to cache on install (CDN scripts are cached on first fetch)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// ── Install: pre-cache shell assets ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for static assets, network-first for Firebase ─
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Let Firebase / Firestore calls go straight to network — never cache them
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis.com')) {
    return; // Default browser fetch
  }

  // Network-first for navigation (always get freshest HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for CDN assets (React, Tailwind, Babel, Firebase SDK)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
