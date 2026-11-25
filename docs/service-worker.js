/* LUMINA — service worker : fonctionnement hors-ligne de l'application.
   Les données de l'utilisateur sont dans localStorage (jamais dans ce cache) : elles restent disponibles hors-ligne.
   - Coquille de l'application : pré-chargée fichier par fichier (un fichier absent n'empêche pas l'installation).
   - Pages : réseau d'abord, repli sur le cache puis sur index.html.
   - Fichiers statiques : cache d'abord, mis à jour en arrière-plan.
   - Appels externes (météo, API IA) : jamais mis en cache. */
const VERSION = 'lumina-v35';   /* changer ce numéro force le renouvellement du cache chez tous les utilisateurs (les anciens caches « lumen-a-* » sont supprimés à l'activation) */
const SHELL = ['./', 'index.html', 'style.css', 'manifest.json', 'logo.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'i18n_dict.js', 'i18n_dict2.js', 'i18n_dict3.js', 'i18n_dict4.js', 'i18n_dict5.js', 'i18n.js',
  'keys-migrate.js', 'app.js', 'modules2.js', 'modules3.js', 'modules4.js', 'modules5.js', 'modules6.js', 'modules7.js', 'modules8.js', 'modules9.js', 'modules10.js', 'modules11.js', 'modules12.js', 'modules13.js', 'modules14.js', 'vendor/xlsx.full.min.js', 'pwa.js', 'auth.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' }))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(x => { const cp = x.clone(); caches.open(VERSION).then(c => c.put(r, cp)); return x; })
      .catch(async () => (await caches.match(r, { ignoreSearch: true })) || (await caches.match('index.html')) || Response.error()));
    return;
  }
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => {
    const net = fetch(r).then(x => { if (x.ok) { const cp = x.clone(); caches.open(VERSION).then(c => c.put(r, cp)); } return x; }).catch(() => hit);
    return hit || net;
  }));
});

/* Retour de la connexion : prévient les pages ouvertes pour qu'elles se rafraîchissent */
self.addEventListener('sync', e => {
  if (e.tag === 'lumina-sync') e.waitUntil(self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage({ type: 'sync' }))));
});
