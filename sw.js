const CACHE = 'kspace-v21';
const ASSETS = ['./','./index.html','./supabase-sync.js','./manifest.webmanifest','./icon.svg','./touch-icon.svg','./icon-512.png'];
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
  // 导航请求：网络优先，保证每次拿到最新页面
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); return res; }).catch(() => caches.match(req).then(m => m || caches.match('./index.html'))));
    return;
  }
  // 其它资源：缓存优先
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); return res; }).catch(() => caches.match('./index.html'))));
});
