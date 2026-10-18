// ReconBank AI — Service Worker v1.1
// v1.1 (2026-10-18): o HTML passa a "rede primeiro" (antes era cache-first e quem já usava a app nunca via
// versões novas) e o nome da cache muda a cada versão do front. Ao publicar um front novo, mudar CACHE.
const CACHE = 'reconbank-v3-2026-10-18';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Requisições ao GAS (API) nunca passam pelo cache
  if (e.request.url.includes('script.google.com')) return;

  const url = new URL(e.request.url);
  const ehHtml = e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');

  if (ehHtml) {
    // Rede primeiro: o utilizador recebe sempre a versão publicada; sem rede, usa a cache.
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp.ok && e.request.method === 'GET') {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return resp;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(resp => {
        if (resp.ok && e.request.method === 'GET') {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return resp;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
