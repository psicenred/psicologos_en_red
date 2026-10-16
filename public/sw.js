/* Service Worker — PWA + Web Push (Camino A).
 * No cachea respuestas: solo reenvía al servidor y muestra notificaciones.
 * v2: Badging API (globo en icono del home screen). */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

async function updateAppBadge(badge) {
  const reg = self.registration;
  if (!reg) return;
  try {
    if (typeof badge === 'number' && badge > 0 && 'setAppBadge' in reg) {
      await reg.setAppBadge(badge);
    } else if (badge === 0 && 'clearAppBadge' in reg) {
      await reg.clearAppBadge();
    } else if (badge === true && 'setAppBadge' in reg) {
      // Solo punto/flag (citas u otros avisos sin conteo)
      await reg.setAppBadge();
    }
  } catch {
    // Sin permiso o sin soporte
  }
}

self.addEventListener('push', (event) => {
  let data = {
    title: 'Psicólogos en Red',
    body: 'Tienes una notificación nueva.',
    url: '/login',
    badge: undefined,
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = {
        title: parsed.title || data.title,
        body: parsed.body || data.body,
        url: parsed.url || data.url,
        badge: typeof parsed.badge === 'number' ? parsed.badge : true,
      };
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
      data.badge = true;
    } catch {
      // ignore
    }
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/images/logo-white-bg.png',
        badge: '/images/logo.png',
        data: { url: data.url },
      }),
      updateAppBadge(data.badge),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/login';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            return client.navigate(targetUrl).then((c) => (c ? c.focus() : client.focus()));
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
