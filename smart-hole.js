/* Condamine Golf GPS: smart nine-hole progression v15.3.
   GPS is advisory; requires tee -> green -> next tee evidence. No server location storage.
   The module is pure apart from optional localStorage integration by its caller. */
(function(root,factory){
  const API=factory();
  if(typeof module==='object' && module.exports)module.exports=API;
  root.CGMHoleProgression=API;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const VERSION=1;
  const GPS_MAX_ACCURACY=30;
  const TEE_RADIUS=30, GREEN_RADIUS=32, NEXT_TEE_RADIUS=27;
  const MIN_SPACED_READINGS_MS=2500;
  const SESSION_MAX_MS=8*60*60*1000;
  function metres(a,b){
    if(!a||!b)return Infinity;
    const k=Math.PI/180, x=(b[0]-a[0])*k,y=(b[1]-a[1])*k;
    const s=Math.sin(x/2)**2+Math.cos(a[0]*k)*Math.cos(b[0]*k)*Math.sin(y/2)**2;
    return 12742000*Math.atan2(Math.sqrt(s),Math.sqrt(Math.max(0,1-s)));
  }
  function fresh(hole=1,now=Date.now()){
    return {version:VERSION,activeHole:hole,completed:[],phase:'await_tee',
      startedAt:now,updatedAt:now,teeSeen:false,greenSeen:false};
  }
  function restore(value,now=Date.now()){
    try{
      const v=typeof value==='string'?JSON.parse(value):value;
      if(!v||v.version!==VERSION||!Number.isInteger(v.startedAt)||
        v.startedAt>now+60000||now-v.startedAt>SESSION_MAX_MS||
        !Number.isInteger(v.activeHole)||v.activeHole<1||v.activeHole>9||
        !Array.isArray(v.completed)||!v.completed.every(n=>Number.isInteger(n)&&n>=1&&n<=9)||
        !['await_tee','toward_green','await_next_tee','round_done'].includes(v.phase))return fresh(1,now);
      return {...fresh(v.activeHole,v.startedAt),...v,completed:[...new Set(v.completed)],updatedAt:now};
    }catch(_){return fresh(1,now);}
  }
  function create(initial,holes,options={}){
    let state=restore(initial,options.now??Date.now());
    let nearTee=null,nearGreen=null,nearNext=null,progressedAway=false;
    const holeData=n=>{const layout=typeof holes==='function'?holes():holes;return layout?.[String(n)]||layout?.[n];};
    function clearCounters(){nearTee=null;nearGreen=null;nearNext=null;progressedAway=false;}
    function markNear(which,now){
      let item=which==='tee'?nearTee:which==='green'?nearGreen:nearNext;
      if(!item){item={count:1,first:now,last:now};}
      else if(now-item.last>=MIN_SPACED_READINGS_MS){item.count++;item.last=now;}
      if(which==='tee')nearTee=item;
      else if(which==='green')nearGreen=item;
      else nearNext=item;
      return item.count>=2 && now-item.first>=MIN_SPACED_READINGS_MS;
    }
    function resetNear(which){if(which==='tee')nearTee=null;else if(which==='green')nearGreen=null;else nearNext=null;}
    function observe(point,accuracy,now=Date.now()){
      if(!Array.isArray(point)||!point.every(Number.isFinite)||!Number.isFinite(accuracy)||accuracy>GPS_MAX_ACCURACY||accuracy<0){return {changed:false,reason:'low_accuracy',state:status()};}
      if(state.phase==='round_done')return {changed:false,reason:'round_done',state:status()};
      const h=holeData(state.activeHole);
      if(!h?.tee||!h?.green)return {changed:false,reason:'missing_layout',state:status()};
      const teeDistance=metres(point,h.tee),greenDistance=metres(point,h.green);
      const holeLength=metres(h.tee,h.green);
      if(state.phase==='await_tee'){
        if(teeDistance<=TEE_RADIUS){
          if(markNear('tee',now)){
            state.teeSeen=true;state.phase='toward_green';state.updatedAt=now;
            clearCounters();return {changed:true,reason:'tee_confirmed',state:status()};
          }
        }else resetNear('tee');
        return {changed:false,reason:'await_tee',state:status()};
      }
      if(state.phase==='toward_green'){
        // It must have moved away from the starting tee and substantially toward the green.
        if(teeDistance>=Math.min(55,holeLength*.25) && greenDistance<holeLength-20)progressedAway=true;
        if(progressedAway && greenDistance<=GREEN_RADIUS){
          if(markNear('green',now)){
            state.greenSeen=true;state.phase=state.activeHole===9?'round_done':'await_next_tee';
            if(state.activeHole===9&&!state.completed.includes(9))state.completed.push(9);
            state.updatedAt=now;clearCounters();
            return {changed:true,reason:state.activeHole===9?'round_complete':'green_confirmed',state:status()};
          }
        }else resetNear('green');
        return {changed:false,reason:'toward_green',state:status()};
      }
      if(state.phase==='await_next_tee'){
        const next=state.activeHole+1,nh=holeData(next);
        if(!nh?.tee)return {changed:false,reason:'missing_next_tee',state:status()};
        const nextD=metres(point,nh.tee),between=metres(h.green,nh.tee);
        const leftGreen=greenDistance>=Math.min(14,between*.5);
        // For holes whose green and next tee are close, ensure the position is
        // closer to the next tee than the previous green (not just inside both geofences).
        if(nextD<=NEXT_TEE_RADIUS && leftGreen && nextD<greenDistance){
          if(markNear('next',now)){
            const finished=state.activeHole;
            if(!state.completed.includes(finished))state.completed.push(finished);
            state.activeHole=next;state.phase='toward_green';state.teeSeen=true;
            state.greenSeen=false;state.updatedAt=now;clearCounters();
            return {changed:true,advanced:true,from:finished,to:next,reason:'next_tee_confirmed',state:status()};
          }
        }else resetNear('next');
        return {changed:false,reason:'await_next_tee',state:status()};
      }
      return {changed:false,reason:'waiting',state:status()};
    }
    function manualSelect(n,now=Date.now()){
      n=Number(n);
      if(!Number.isInteger(n)||n<1||n>9)return status();
      if(n!==state.activeHole){
        // Selecting an earlier hole makes that hole and later holes playable again.
        if(n<state.activeHole||state.completed.includes(n))state.completed=state.completed.filter(x=>x<n);
        state.activeHole=n;state.phase='await_tee';state.teeSeen=false;state.greenSeen=false;
        state.updatedAt=now;clearCounters();
      }
      return status();
    }
    function nextManually(now=Date.now()){
      const previous=state.activeHole;
      if(!state.completed.includes(previous))state.completed.push(previous);
      if(previous===9){state.phase='round_done';state.greenSeen=true;}
      else {state.activeHole=previous+1;state.phase='await_tee';state.teeSeen=false;state.greenSeen=false;}
      state.updatedAt=now;clearCounters();return status();
    }
    function startNew(n=1,now=Date.now()){state=fresh(n,now);clearCounters();return status();}
    function status(){return {...state,completed:[...state.completed].sort((a,b)=>a-b)};}
    return {observe,manualSelect,nextManually,startNew,status};
  }
  return {create,restore,fresh,metres,CONSTANTS:{TEE_RADIUS,GREEN_RADIUS,NEXT_TEE_RADIUS,GPS_MAX_ACCURACY}};
});
