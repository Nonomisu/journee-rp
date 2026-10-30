// Service worker de Journée RP : il ne sert qu'aux notifications push (aucune mise en cache des pages).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Notification envoyée par le service du VPS : { title, body, tag, url }
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Journée RP', {
    body: d.body || '', tag: d.tag, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' },
  }));
});

// Toucher la notification ouvre l'appli sur la fiche concernée.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      try { if ('navigate' in w) { await w.navigate(url); return w.focus(); } } catch {}
    }
    return self.clients.openWindow(url);
  })());
});
