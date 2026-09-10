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

// ------------------------------------------------------------------
// Web Push: this is what actually shows the notification when the
// server sends one. Runs even if the app isn't open — that's the whole
// point of push, this is a background event, not something triggered
// from inside the React app.
// ------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'PolyNet', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'PolyNet'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
  }

  console.log('[sw] push event received', data)
  event.waitUntil(self.registration.showNotification(title, options))
})

// Tapping the notification focuses an already-open PolyNet tab if one
// exists, instead of always opening a brand new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  console.log('[sw] notification click, opening', targetUrl)
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})