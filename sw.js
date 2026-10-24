/* 行途录 Service Worker —— 缓存名 xingtu-v1 */
const CACHE = 'xingtu-v1';
const PRECACHE = ['./index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // 导航请求:network-first,超时回退缓存 index.html
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await Promise.race([
          fetch(req),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return res;
      } catch (err) {
        const cached = await caches.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // 其余 GET(跨域地图瓦片/CDN 与同域静态资源):stale-while-revalidate
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});
