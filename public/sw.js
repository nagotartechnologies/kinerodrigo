// Service worker propio de la app (reemplaza al generado por next-pwa).
// - Las páginas se piden siempre a la red primero; la copia en caché solo se
//   usa sin conexión. Así cada despliegue nuevo se ve al recargar.
// - Las APIs y los assets no se interceptan (los assets de Next ya tienen hash).
// - Al activarse borra las cachés antiguas de next-pwa/workbox.
const CACHE_PAGINAS = 'kine-paginas-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter((clave) => clave !== CACHE_PAGINAS).map((clave) => caches.delete(clave)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  event.respondWith((async () => {
    try {
      const respuesta = await fetch(request);
      if (respuesta.ok) {
        const cache = await caches.open(CACHE_PAGINAS);
        cache.put(request, respuesta.clone());
      }
      return respuesta;
    } catch (error) {
      const enCache = await caches.match(request);
      if (enCache) return enCache;
      throw error;
    }
  })());
});
