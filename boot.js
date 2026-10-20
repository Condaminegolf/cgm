/* Condamine Golf GPS bootstrap: try CDN alternatives and retain cached files. */
(function(){
 const sources=[
   {css:'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',js:'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'},
   {css:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',js:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'},
   {css:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',js:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'}
 ];
 function injectStyle(url){const l=document.createElement('link');l.rel='stylesheet';l.href=url;document.head.appendChild(l)}
 function loadScript(url){return new Promise((resolve,reject)=>{
   const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('Unable to load '+url));document.head.appendChild(s);
 })}
 async function boot(){
   const status=document.getElementById('fatal');let ok=false;
   for(const source of sources){
     try{injectStyle(source.css);await loadScript(source.js);if(window.L?.map){ok=true;break}}catch(e){console.warn(e.message)}
   }
   if(!ok){
     if(status){status.style.display='block';status.textContent='Map library unavailable. Connect to Wi-Fi and reload once to prepare offline use.'}
     return;
   }
   try{await loadScript('./app.js')}catch(e){console.error(e);if(status){status.style.display='block';status.textContent='App could not start. Reload or clear stored website data.'}}
 }
 boot();
})();
