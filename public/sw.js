const CACHE_NAME = 'rcl-static-v1';
const STATIC_ASSETS = [
  '/favicon.svg',
  '/icons/180',
  '/icons/192',
  '/icons/512',
  '/icons/512-maskable',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => offlineResponse())
    );
    return;
  }

  const cacheableStatic = url.pathname.startsWith('/_next/static/')
    || url.pathname.startsWith('/icons/')
    || url.pathname === '/favicon.svg';

  if (!cacheableStatic) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

function offlineResponse() {
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#03070D">
  <title>RCL · Offline</title>
  <style>
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#03070d;color:#f6f8fb;font-family:Inter,system-ui,sans-serif}
    body{min-height:100dvh;display:grid;place-items:center;padding:24px}
    main{width:min(440px,100%);border:1px solid rgba(21,159,255,.24);border-radius:28px;background:radial-gradient(circle at 12% 0%,rgba(21,159,255,.18),transparent 35%),radial-gradient(circle at 100% 100%,rgba(255,79,22,.13),transparent 38%),#071522;padding:28px;text-align:center;box-shadow:0 30px 90px rgba(0,0,0,.45)}
    img{width:84px;height:84px;border-radius:22px;box-shadow:0 18px 44px rgba(0,0,0,.34)}
    small{display:block;margin-top:18px;color:#ff4f16;font-weight:900;letter-spacing:.2em}h1{margin:7px 0 0;font-size:36px;line-height:.95;text-transform:uppercase}p{margin:14px auto 0;max-width:320px;color:rgba(246,248,251,.55);font-size:14px;line-height:1.6}
    button{margin-top:22px;min-height:48px;border:0;border-radius:14px;background:#ff4f16;padding:0 22px;color:#03070d;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
  </style>
</head>
<body>
  <main>
    <img src="/icons/192" alt="">
    <small>RCL NETWORK</small>
    <h1>You’re offline</h1>
    <p>Live scores, messages, posts and member data need a connection. Reconnect, then try again.</p>
    <button onclick="location.reload()">Try again</button>
  </main>
</body>
</html>`, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
