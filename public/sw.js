// Minimal service worker. Its only job right now is to exist and handle
// fetch — that's what Chrome/Android require before they'll treat the app
// as genuinely "installable" (a proper standalone launch, its own window,
// no address bar). Without any service worker registered, "Add to Home
// Screen" on Android typically just creates a shortcut that reopens in a
// normal browser tab, which is very likely what's been happening.
//
// This doesn't cache anything or work offline yet — it just passes every
// request straight through to the network. That's a deliberate, safe
// starting point: it satisfies the installability requirement without
// changing how the app loads or risking stale cached content. Real
// offline support (caching the app shell, falling back when offline) can
// be layered on top of this later if you want it.

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
