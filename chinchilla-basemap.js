/* Chinchilla aerial basemap, v15.7. Cached QLD imagery is native through z20.
 * z21–22 enlarge z20 tiles; the Esri underlay remains available if QLD fails. */
(function(root){
  'use strict';
  root.createChinchillaBasemap=function(map, status){
    const esri=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:22,maxNativeZoom:19,zIndex:1,attribution:'Imagery © Esri and contributors'}).addTo(map);
    const qld=L.tileLayer('https://spatial-img.information.qld.gov.au/arcgis/rest/services/Basemaps/LatestStateProgram_AllUsers/ImageServer/tile/{z}/{y}/{x}',{maxZoom:22,maxNativeZoom:20,zIndex:2,attribution:'Includes material © State of Queensland; © Planet Labs Netherlands B.V. under licence, 2026'});
    let mode='auto', failures=0, loaded=0;
    const say=(s)=>{if(status)status.textContent=s};
    const wantQld=()=>mode==='qld'||(mode==='auto'&&map.getZoom()>=19);
    function label(){
      const z=map.getZoom();
      if(!wantQld())say('Esri Satellite · zoom '+z+(z>19?' · enlarged imagery':''));
      else if(failures>0&&loaded===0)say('Queensland aerial unavailable · Esri fallback · zoom '+z);
      else if(failures>0)say('Queensland aerial / Esri fallback · zoom '+z+(z>20?' · enlarged imagery':''));
      else say('Queensland aerial'+(loaded?'':' · loading')+' · zoom '+z+(z>20?' · enlarged imagery':''));
    }
    function sync(){
      const want=wantQld();
      if(want&&!map.hasLayer(qld)){failures=0;loaded=0;qld.addTo(map)}
      else if(!want&&map.hasLayer(qld))map.removeLayer(qld);
      label();
    }
    qld.on('loading',()=>{failures=0;loaded=0;label()});
    qld.on('tileload',()=>{loaded++;label()});
    qld.on('tileerror',e=>{failures++;if(e.tile)e.tile.style.visibility='hidden';label()});
    esri.on('tileerror',()=>{if(!wantQld())say('Esri imagery unavailable · check internet connection')});
    map.on('zoomend',sync);
    const selector=document.createElement('select');
    selector.setAttribute('aria-label','Chinchilla map imagery');
    [['auto','Auto: Esri 0–18 / QLD 19+'],['qld','Queensland aerial'],['esri','Esri Satellite']].forEach(([value,name])=>selector.add(new Option(name,value)));
    selector.addEventListener('change',()=>{mode=selector.value;sync()});
    if(status){status.before(selector);selector.style.maxWidth='100%';}
    sync();
    return {esri,qld};
  };
})(window);
