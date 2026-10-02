const CACHE_NAME = 'rcl-static-v9';
const SW_VERSION = 'v9';
const STATIC_ASSETS = [
  '/favicon.svg',
  '/icon',
  '/apple-icon',
  '/icons/rcl-app-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();

    // iOS installed PWAs can keep the previous document alive after a worker update.
    // Force controlled windows through a real navigation once the new worker owns them.
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(windows.map(async (client) => {
      try {
        const url = new URL(client.url);
        if (url.origin === self.location.origin && 'navigate' in client) {
          await client.navigate(client.url);
        }
      } catch {
        // A client can disappear while the worker is activating.
      }
    }));
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'RCL_SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
    return;
  }

  if (event.data?.type === 'RCL_GET_VERSION') {
    event.source?.postMessage?.({ type: 'RCL_SW_VERSION', version: SW_VERSION });
    return;
  }

  if (event.data?.type !== 'RCL_BADGE_COUNT') return;
  const count = Math.max(0, Number(event.data.count) || 0);
  event.waitUntil(updateBadge(count));
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { body: event.data?.text() || 'New Rich City League activity.' };
  }

  const badgeCount = Math.max(0, Number(payload.badgeCount) || 1);
  const title = payload.title || 'Rich City League';
  const url = normalizeNotificationUrl(payload.url || '/notifications');

  event.waitUntil(Promise.all([
    updateBadge(badgeCount),
    self.registration.showNotification(title, {
      body: payload.body || 'New RCL activity needs your attention.',
      icon: '/icon',
      badge: '/favicon.svg',
      tag: payload.tag || 'rcl-notification',
      renotify: true,
      data: {
        url,
        notificationId: payload.notificationId || null,
        type: payload.type || 'activity',
      },
    }),
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = normalizeNotificationUrl(event.notification.data?.url || '/notifications');
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      try {
        const current = new URL(client.url);
        if (current.origin === self.location.origin) {
          if ('navigate' in client) await client.navigate(target);
          if ('focus' in client) return client.focus();
        }
      } catch {
        // Continue to opening a new window.
      }
    }
    return self.clients.openWindow(target);
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => offlineResponse())
    );
    return;
  }

  // Next.js build assets are content-addressed and should be handled by the
  // browser/Vercel cache. Cache-first service-worker handling here can strand an
  // installed iOS PWA on an old CSS/JS bundle even after a new document loads.
  if (url.pathname.startsWith('/_next/static/')) return;

  const cacheableStatic = url.pathname.startsWith('/icons/')
    || url.pathname === '/favicon.svg'
    || url.pathname === '/icon'
    || url.pathname === '/apple-icon';

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

function normalizeNotificationUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? `${url.pathname}${url.search}${url.hash}` : '/notifications';
  } catch {
    return '/notifications';
  }
}

async function updateBadge(count) {
  try {
    if (count > 0 && 'setAppBadge' in self.navigator) await self.navigator.setAppBadge(count);
    else if (count === 0 && 'clearAppBadge' in self.navigator) await self.navigator.clearAppBadge();
    else if (count === 0 && 'setAppBadge' in self.navigator) await self.navigator.setAppBadge(0);
  } catch {
    // Badging is not supported on every installed PWA platform.
  }
}

function offlineResponse() {
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#F6F9FC">
  <title>RCL · Offline</title>
  <style>
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#F6F9FC;color:#0F2547;font-family:Arial,Helvetica,system-ui,sans-serif}
    body{min-height:100dvh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 85% 0,rgba(59,130,246,.10),transparent 30rem),radial-gradient(circle at 0 100%,rgba(100,116,139,.08),transparent 28rem),#F6F9FC}
    main{width:min(440px,100%);border:1px solid #D9E4EF;border-radius:18px;background:#fff;padding:28px;text-align:center;box-shadow:0 20px 55px rgba(15,37,71,.10)}
    img{width:84px;height:84px;border-radius:18px;box-shadow:0 12px 28px rgba(15,37,71,.12)}
    small{display:block;margin-top:18px;color:#3B82F6;font-weight:800;letter-spacing:.12em}h1{margin:8px 0 0;font-size:32px;line-height:1.08;font-weight:800}p{margin:14px auto 0;max-width:320px;color:#64748B;font-size:14px;line-height:1.6}
    button{margin-top:22px;min-height:48px;border:0;border-radius:12px;background:#3B82F6;padding:0 22px;color:#fff;font-weight:800;letter-spacing:.02em}
  </style>
</head>
<body>
  <main>
    <img src="/icon" alt="">
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
