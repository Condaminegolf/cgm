/* Read-only link viewer. Possession of 128-bit random UUID is the viewing capability. */
(()=>{'use strict';
const URL='https://ezyeexvpuuzmnjpoxqay.supabase.co',KEY='sb_publishable_mRNgVa5HNIjs3-7ejM441Q_udpjxvTH',id=new URLSearchParams(location.search).get('id');
const $=x=>document.getElementById(x);
const clock=x=>new Intl.DateTimeFormat('en-AU',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'Australia/Brisbane'}).format(new Date(x));
function showEmpty(t){$('roundLabel').textContent='ROUND UNAVAILABLE';$('holeValue').textContent='—';$('finishValue').textContent='—';$('updatedValue').textContent=t;$('progress').replaceChildren();}
let busy=false;
async function refresh(){
 if(busy)return;
 if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)){showEmpty('Invalid progress link.');return;}
 if(!navigator.onLine){$('status').textContent='Offline — showing the last loaded update.';return;}
 busy=true;$('status').textContent='Checking…';
 try{
   const response=await fetch(URL+'/rest/v1/rpc/golf_view_round_progress',{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({p_share_id:id}),cache:'no-store',referrerPolicy:'no-referrer'});
   if(!response.ok)throw new Error('Unable to read updates (HTTP '+response.status+')');
   const p=await response.json();
   if(!p){showEmpty('This link has expired or the golfer has stopped sharing.');$('status').textContent='';return;}
   const n=Math.max(1,Math.min(9,Number(p.current_hole)||1)),ended=!!p.ended;
   $('roundLabel').textContent=ended?'ROUND FINISHED':'CURRENT HOLE';$('holeValue').textContent=ended?'Finished':'Hole '+n+' / 9';
   $('finishValue').textContent=ended?'Round complete':clock(p.eta_at);
   const mins=Math.max(0,Math.round((Date.now()-Date.parse(p.updated_at))/60000));
   $('updatedValue').textContent=ended?'Completed. Last update '+clock(p.updated_at):'Last update '+clock(p.updated_at)+(mins>0?' · '+mins+' min ago':' · just now');
   $('updatedValue').classList.toggle('stale',mins>=5&&!ended);
   const frag=document.createDocumentFragment();for(let i=1;i<=9;i++){const cell=document.createElement('i');cell.className=ended||i<n?'done':i===n?'current':'';frag.appendChild(cell)}$('progress').replaceChildren(frag);
   $('status').textContent=ended?'This round has ended.':'Auto-refreshes every 30 seconds.'+(mins>=5?' This update may be delayed.':'');
 }catch(e){$('status').textContent='Could not refresh: '+e.message+' · Try again later.';}
 finally{busy=false;}
}
$('refresh').addEventListener('click',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});refresh();setInterval(()=>{if(document.visibilityState==='visible')refresh()},30000);
})();
