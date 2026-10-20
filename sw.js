const CORE='condamine-v7-2-core',VEND='condamine-v7-2-vendors';
const core=['./','./index.html','./boot.js','./app.js','./offline-course.jpg','./manifest.webmanifest','./apple-touch-icon.png'];
const vendors=[
'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const c=await caches.open(CORE);
 await Promise.all(core.map(async path=>{try{await c.add(new Request(path,{cache:'reload'}))}catch(error){console.warn('Core cache failed',path,error)}}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 for(const k of await caches.keys())if(k.startsWith('condamine-')&&!([CORE,VEND].includes(k)))await caches.delete(k);
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
 const req=e.request, url=new URL(req.url);
 if(vendors.includes(url.href)){
   e.respondWith((async()=>{
     const c=await caches.open(VEND),hit=await c.match(req);if(hit)return hit;
     const r=await fetch(req);if(r.ok||r.type==='opaque')await c.put(req,r.clone());return r;
   })());return;
 }
 if(url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
   e.respondWith((async()=>{try{
     const response=await fetch(req,{cache:'no-store'});
     if(response.ok){const c=await caches.open(CORE);await c.put('./index.html',response.clone())}return response;
   }catch(error){const c=await caches.open(CORE);return await c.match('./index.html')||await c.match('./')||Response.error()}})());return;
 }
 e.respondWith((async()=>{
  const c=await caches.open(CORE),hit=await c.match(req);if(hit)return hit;
  try{const r=await fetch(req);if(r.ok)await c.put(req,r.clone());return r}catch(error){return Response.error()}
 })());
});
