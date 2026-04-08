// MensSana — Service Worker
// Caches app shell for offline use. Chat requires network.

const CACHE = 'menssana-v22'
const ASSETS = [
  '/MensSana/',
  '/MensSana/index.html',
  '/MensSana/styles.css?v=6',
  '/MensSana/app.js',
  '/MensSana/supabase.min.js',
  '/MensSana/manifest.json',
]

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  // Only cache same-origin requests — let Supabase/API calls pass through
  if (url.origin !== location.origin) return
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then(cached => cached ?? fetch(e.request))
  )
})
