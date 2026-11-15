// Rede primeiro, cópia guardada quando não há rede. Com rede, o app está sempre na versão
// publicada; sem rede, abre a última que foi vista.
const CACHE = 'paulistao-2027-v1';
// A cópia vale seja qual for o cabeçalho Vary do servidor: o pedido que a guardou e o que
// a procura (um <script type="module">, um worker) não têm os mesmos cabeçalhos.
const ACHAR = { ignoreSearch: true, ignoreVary: true };

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Na primeira visita os arquivos chegam antes de este worker assumir a página, então ela
// manda a lista do que carregou e a cópia é feita aqui. Sem isso, abrir sem rede só
// funcionaria a partir da segunda visita.
self.addEventListener('message', e => {
  if (!e.data || e.data.tipo !== 'guardar') return;
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(e.data.urls.map(u => c.add(u).catch(() => {})))));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return res;
    }).catch(() => caches.match(req, ACHAR).then(m => m || (req.mode === 'navigate' ? caches.match('./', ACHAR) : Response.error())))
  );
});
