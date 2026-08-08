const CACHE = 'kspace-v23';
const ASSETS = ['./supabase-sync.js','./manifest.webmanifest','./icon.svg','./touch-icon.svg','./icon-512.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{})); });
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.matchAll({type:'window',includeUncontrolled:true}))
    .then(clients => clients.forEach(c => c.postMessage({type:'reload'})))
  );
  self.clients.claim();
});
self.addEventListener('message', e => {
  if(e.data && e.data.type==='getCache' && e.ports && e.ports[0]){
    e.ports[0].postMessage({cache: CACHE});
  }
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 跨域请求直接走网络（Supabase、OpenRouter 等）
  if(url.origin !== self.location.origin){
    return;
  }
  // 导航请求：强制从网络获取最新 HTML（不写入 SW 缓存，避免污染）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, {cache:'reload'})
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // 其它资源（JS/CSS/SVG/PNG）：缓存优先，离线可用
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const c = res.clone();
      if(res.ok) caches.open(CACHE).then(ca => ca.put(req, c));
      return res;
    }).catch(()=>caches.match('./index.html')))
  );
});