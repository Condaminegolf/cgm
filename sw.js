const CORE='condamine-v7-core', VEND='condamine-v7-vendors';
const core=['./','./index.html','./offline-course.jpg','./manifest.webmanifest','./apple-touch-icon.png'];
const vendors=['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const c=await caches.open(CORE);
  await Promise.all(core.map(async url=>{try{await c.add(new Request(url,{cache:'reload'}))}catch(e){}}));
  const v=await caches.open(VEND);
  await Promise.all(vendors.map(async url=>{try{const r=await fetch(new Request(url,{mode:'no-cors',cache:'reload'}));if(r.ok||r.type==='opaque')await v.put(url,r)}catch(e){}}));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('condamine-')&&!([CORE,VEND].includes(k)))await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(u.hostname==='unpkg.com'&&u.pathname.startsWith('/leaflet@1.9.4/dist/')){
   event.respondWith((async()=>{const c=await caches.open(VEND);const match=await c.match(event.request.url);if(match)return match;
     const r=await fetch(event.request);if(r.ok||r.type==='opaque')c.put(event.request.url,r.clone());return r})());return;
 }
 if(u.origin!==self.location.origin)return; // live satellite map requests remain network-only
 if(event.request.mode==='navigate'){
   event.respondWith((async()=>{try{const r=await fetch(event.request);const c=await caches.open(CORE);c.put('./index.html',r.clone());return r}catch(e){const c=await caches.open(CORE);return await c.match('./index.html')||await c.match('./')||Response.error()}})());return;
 }
 event.respondWith((async()=>{const c=await caches.open(CORE),hit=await c.match(event.request);if(hit)return hit;try{const r=await fetch(event.request);if(r.ok)c.put(event.request,r.clone());return r}catch(e){return Response.error()}})());
});
