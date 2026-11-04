/* 离线缓存 Service Worker（由 vite-plugin-pwa 生成的 SW 会覆盖，此文件作为回退） */
const CACHE = 'beer-game-v1';
self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((c) => {
      return (
        c ||
        fetch(e.request)
          .then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, copy));
            return resp;
          })
          .catch(() => c)
      );
    })
  );
});