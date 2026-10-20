(()=>{'use strict';
const URL='https://ezyeexvpuuzmnjpoxqay.supabase.co';
const KEY='sb_publishable_mRNgVa5HNIjs3-7ejM441Q_udpjxvTH';
const $=id=>document.getElementById(id), msg=t=>{$('liveStatus').textContent=t};
const escapeHTML=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey='cggps_v9_comp';let sb=null,uid=null,comp=null,sub=null,refreshTimer=null;
function pending(){try{return JSON.parse(localStorage.getItem('cggps_v9_pending')||'{}')}catch{return {}}}
function setPending(v){localStorage.setItem('cggps_v9_pending',JSON.stringify(v))}
function drawHoles(){const div=$('liveHoles');div.innerHTML='';for(let i=1;i<=9;i++){const w=document.createElement('label');w.style='font-size:12px;display:flex;align-items:center;gap:5px';w.append(document.createTextNode('H'+i));const input=document.createElement('input');input.type='number';input.min=1;input.max=25;input.step=1;input.inputMode='numeric';input.id='liveH'+i;input.style='width:68px;padding:8px';w.append(input);div.append(w)}}
let joining=false;
async function ensureUser(){
  if(!sb) throw new Error('Supabase library has not loaded. Reload while online.');
  const {data:sessionData,error:sessionError}=await sb.auth.getSession();
  if(sessionError && !/refresh|session|token|invalid/i.test(sessionError.message||'')) throw sessionError;
  let session=sessionData?.session;
  if(session){
    try{
      const r=await sb.auth.getUser();
      if(!r.error && r.data?.user?.id){uid=r.data.user.id;return uid}
      if(r.error && !/refresh|token|session|user.*not.*found|invalid|jwt/i.test(r.error.message||'') && r.error.status!==401 && r.error.status!==403)throw r.error;
    }catch(e){
      if(!/refresh|token|session|user.*not.*found|invalid|jwt/i.test(e.message||'') && e.status!==401 && e.status!==403)throw e;
    }
    // The anonymous user was deleted or the refresh token was revoked.
    // Only remove the Supabase auth session key; preserve scorecards and offline scores.
    try{await sb.auth.signOut({scope:'local'})}catch(e){console.warn('Local sign out:',e)}
    for(const key of Object.keys(localStorage)){
      if(/^sb-[a-z0-9]+-auth-token$/.test(key))localStorage.removeItem(key);
    }
    localStorage.removeItem(storageKey);
    comp=null;
  }
  if(!navigator.onLine)throw new Error('Internet is required for the first sign-in. Your offline scores are preserved.');
  const result=await sb.auth.signInAnonymously();
  if(result.error)throw result.error;
  uid=result.data?.user?.id || result.data?.session?.user?.id;
  if(!uid)throw new Error('Sign-in did not return a player ID.');
  return uid;
}
async function init(){
  drawHoles();
  $('liveJoinBtn').onclick=join;
  $('liveSaveBtn').onclick=save;
  $('liveLeaveBtn').onclick=()=>{comp=null;localStorage.removeItem(storageKey);$('liveMain').hidden=true;$('liveJoin').hidden=false;$('liveJoin').style.display='flex';msg('Enter a name and competition code'); if(sub)sb.removeChannel(sub)};
  if(!window.supabase?.createClient){msg('Live scoring library unavailable. GPS and local scoring still work. Connect to the internet and reload.');return}
  sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  try{
    await ensureUser();
    const old=JSON.parse(localStorage.getItem(storageKey)||'null');
    if(old?.id){comp=old.id;await openCompetition()}
    else msg('Ready to join a competition');
  }catch(e){msg('Connection issue: '+(e.message||String(e)))}
}
async function join(){
  if(joining)return;
  const name=$('liveName').value.trim(),code=$('liveCode').value.trim();
  if(name.length<2||code.length<6){msg('Enter a player name and a code of at least 6 characters');return}
  if(!navigator.onLine){msg('Connect to the internet to join. Your existing scores remain saved.');return}
  joining=true;$('liveJoinBtn').disabled=true;msg('Checking your player session…');
  try{
    await ensureUser();
    msg('Joining competition…');
    // Verify the browser has a current authenticated session before the RPC.
    let {data:{session},error:sessionError}=await sb.auth.getSession();
    if(sessionError || !session?.access_token){
      await ensureUser();
      ({data:{session},error:sessionError}=await sb.auth.getSession());
    }
    if(sessionError || !session?.access_token)throw new Error('Player sign-in is missing. Open the app online and retry.');
    const userCheck=await sb.auth.getUser(session.access_token);
    if(userCheck.error || !userCheck.data?.user?.id){
      await sb.auth.signOut({scope:'local'}).catch(()=>{});
      await ensureUser();
      ({data:{session},error:sessionError}=await sb.auth.getSession());
      if(sessionError || !session?.access_token)throw new Error('Unable to restore your player session.');
    }
    // Explicit Authorization prevents a publishable-key-only (anon) RPC.
    const response=await fetch(URL+'/rest/v1/rpc/join_golf_competition',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+session.access_token},
      body:JSON.stringify({p_name:name,p_code:code})
    });
    const body=await response.json().catch(()=>null);
    if(!response.ok)throw new Error((body?.message||body?.error||'Competition join request failed')+' (HTTP '+response.status+')');
    if(!body)throw new Error('The database did not return a competition ID.');
    comp=body;
    localStorage.setItem(storageKey,JSON.stringify({id:comp,name,userId:uid}));
    await openCompetition();
  }catch(e){msg('Could not join: '+(e.message||String(e))+' — check the competition code and retry.');}
  finally{joining=false;$('liveJoinBtn').disabled=false}
}
async function openCompetition(){if(!comp||!sb)return;try{const {data, error}=await sb.from('golf_competitions').select('title,active').eq('id',comp).single();if(error)throw error;$('liveTitle').textContent=data.title+(data.active?'':' · Closed');$('liveJoin').hidden=true;$('liveJoin').style.display='none';$('liveMain').hidden=false;msg(navigator.onLine?'Connected — shared scores enabled':'Offline — showing last available scores');await loadScores();await refresh();subscribe();await flushPending();}catch(e){msg('Could not load competition: '+e.message+' (join again if session was reset)');$('liveJoin').hidden=false;$('liveJoin').style.display='flex';$('liveMain').hidden=true}}
async function loadScores(){const {data,error}=await sb.from('golf_scores').select('hole,strokes').eq('competition_id',comp).eq('user_id',uid);if(error)throw error;for(const row of data||[])$('liveH'+row.hole).value=row.strokes;const queue=pending();const mine=queue[comp]||{};for(const [h,st] of Object.entries(mine))$('liveH'+h).value=st;}
async function save(){if(!comp)return;const queue=pending();queue[comp]=queue[comp]||{};for(let i=1;i<=9;i++){const s=$('liveH'+i).value.trim();if(!s)continue;const n=Number(s);if(!Number.isInteger(n)||n<1||n>25){msg('Hole '+i+' must be between 1 and 25 strokes');return}queue[comp][i]=n}setPending(queue);msg('Scores saved on this device. Syncing…');await flushPending();await refresh()}
async function flushPending(){if(!sb||!uid||!comp||!navigator.onLine)return;const q=pending(), mine=q[comp]||{};const rows=Object.entries(mine).map(([hole,strokes])=>({competition_id:comp,user_id:uid,hole:Number(hole),strokes}));if(!rows.length){$('livePending').textContent='';return}const r=await sb.from('golf_scores').upsert(rows,{onConflict:'competition_id,user_id,hole'});if(r.error){msg('Saved offline, sync pending: '+r.error.message);$('livePending').textContent=rows.length+' scores waiting to sync';return}delete q[comp];setPending(q);$('livePending').textContent='All scores synced';msg('Live scores updated')}
async function refresh(){if(!comp||!sb||!navigator.onLine){const cached=localStorage.getItem('cggps_v9_board_'+comp);if(cached)$('liveBoard').innerHTML=cached;return}
const [a,b]=await Promise.all([sb.from('golf_entries').select('user_id,player_name').eq('competition_id',comp),sb.from('golf_scores').select('user_id,hole,strokes').eq('competition_id',comp)]);
if(a.error||b.error){msg('Leaderboard refresh failed: '+(a.error||b.error).message);return}
const by={};for(const p of a.data||[])by[p.user_id]={name:p.player_name,holes:new Set(),total:0};for(const s of b.data||[]){const p=by[s.user_id];if(!p)continue;p.holes.add(s.hole);p.total+=s.strokes}
const records=Object.values(by).sort((x,y)=>(x.holes.size===9?0:1)-(y.holes.size===9?0:1)|| (x.holes.size===9?x.total-y.total:y.holes.size-x.holes.size)||x.name.localeCompare(y.name));let rows=records.map((p,i)=>'<tr><td style="padding:6px">'+(i+1)+'</td><td style="padding:6px">'+escapeHTML(p.name)+'</td><td style="padding:6px">'+p.holes.size+'/9</td><td style="padding:6px">'+p.total+'</td></tr>').join('');const html='<div style="overflow:auto"><table style="width:100%;font-size:13px"><thead><tr><th>Pos</th><th>Player</th><th>Holes</th><th>Strokes</th></tr></thead><tbody>'+ (rows||'<tr><td colspan="4">No scores yet</td></tr>')+'</tbody></table></div>';
$('liveBoard').innerHTML=html;localStorage.setItem('cggps_v9_board_'+comp,html)}
function subscribe(){if(sub)sb.removeChannel(sub);sub=sb.channel('golf-v9-'+comp).on('postgres_changes',{event:'*',schema:'public',table:'golf_scores',filter:'competition_id=eq.'+comp},refresh).on('postgres_changes',{event:'*',schema:'public',table:'golf_entries',filter:'competition_id=eq.'+comp},refresh).subscribe();if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(comp){flushPending();refresh()}},30000)}
window.addEventListener('online',()=>{if(comp){flushPending();refresh()}else init()});
init();})();