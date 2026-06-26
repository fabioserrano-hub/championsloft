const CACHE = 'championsloft-v2'
const STATIC = ['/','/?pwa=1','/manifest.json']

// Instalar — cache dos estáticos
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()))
})

// Activar — limpar caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Fetch — network first, fallback para cache
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  // Não interceptar Supabase, Stripe, APIs externas
  if (url.hostname.includes('supabase') || url.hostname.includes('stripe') ||
      url.hostname.includes('api.') || url.pathname.startsWith('/api/')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache GET de recursos estáticos
        if (e.request.method === 'GET' && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request).then(cached => {
        if (cached) return cached
        // Offline fallback para navegação
        if (e.request.mode === 'navigate') return caches.match('/')
        return new Response('Offline', { status: 503 })
      }))
  )
})

// Push notifications
self.addEventListener('push', e => {
  const data = e.data?.json() || {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'ChampionsLoft', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'cl-notif',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'))
})
