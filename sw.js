const SHELL = 'ouca-fr-shell-v1';
const AUDIO = 'ouca-fr-audio-v1';
const ARQUIVOS = ['./', 'index.html', 'style.css', 'app.js', 'data.json', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== AUDIO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// iOS/Safari exige resposta 206 (Range) para tocar áudio vindo do cache
async function responderRange(req, resp) {
  const buf = await resp.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range'));
  const total = buf.byteLength;
  let ini = m && m[1] ? parseInt(m[1], 10) : 0;
  let fim = m && m[2] ? parseInt(m[2], 10) : total - 1;
  if (fim >= total) fim = total - 1;
  return new Response(buf.slice(ini, fim + 1), { status: 206, statusText: 'Partial Content', headers: { 'Content-Type': 'audio/mpeg', 'Content-Range': 'bytes ' + ini + '-' + fim + '/' + total, 'Content-Length': String(fim - ini + 1), 'Accept-Ranges': 'bytes' } });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.includes('/audio/')) {
    e.respondWith((async () => {
      const cache = await caches.open(AUDIO);
      const chave = url.origin + url.pathname;
      let r = await cache.match(chave);
      if (!r) {
        const rede = await fetch(chave);
        if (rede.ok && rede.status === 200) { cache.put(chave, rede.clone()); r = rede; }
        else return rede;
      }
      return req.headers.has('range') ? responderRange(req, r) : r;
    })());
    return;
  }
  if (url.pathname.endsWith('.pdf')) return; // PDF vai direto da rede
  e.respondWith(caches.match(req).then(c => c || fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(SHELL).then(ca => ca.put(req, cp)); } return r; })));
});
