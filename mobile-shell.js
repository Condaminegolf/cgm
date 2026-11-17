/* Shared course drawer. Independent of the GPS/map SDK and course data. */
(function(){
 'use strict';
 const button=document.getElementById('courseMenu');
 const drawer=document.getElementById('courseDrawer')||document.getElementById('drawer');
 const close=document.getElementById('courseClose')||document.getElementById('closeMenu');
 const backdrop=document.getElementById('cgmDrawerBackdrop');
 if(!button||!drawer||!close||!backdrop)return;
 let savedY=0, oldStyle=null, inertState=[];
 function openDrawer(){
  if(!drawer.hidden)return;
  savedY=window.scrollY; const body=document.body;
  oldStyle={position:body.style.position,top:body.style.top,left:body.style.left,right:body.style.right,width:body.style.width};
  Object.assign(body.style,{position:'fixed',top:-savedY+'px',left:'0',right:'0',width:'100%'});
  document.documentElement.classList.add('cgm-drawer-open');
  drawer.hidden=false;backdrop.hidden=false;button.setAttribute('aria-expanded','true');
  inertState=[];
  for(const el of body.children){if(el===drawer||el===backdrop||/^(SCRIPT|STYLE|LINK)$/.test(el.tagName))continue;inertState.push([el,el.inert]);el.inert=true;}
  close.focus({preventScroll:true});
 }
 function closeDrawer(restoreFocus=true){
  if(drawer.hidden)return;
  drawer.hidden=true;backdrop.hidden=true;button.setAttribute('aria-expanded','false');
  for(const [el,prev] of inertState)el.inert=prev;
  inertState=[];document.documentElement.classList.remove('cgm-drawer-open');
  if(oldStyle)Object.assign(document.body.style,oldStyle);
  oldStyle=null;window.scrollTo(0,savedY);
  if(restoreFocus)button.focus({preventScroll:true});
 }
 // Capture handlers so legacy onclick assignments cannot conflict, even if
 // the course script loads later. Leave existing application JS untouched.
 button.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openDrawer();},true);
 close.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();closeDrawer();},true);
 backdrop.addEventListener('click',()=>closeDrawer());
 drawer.addEventListener('click',e=>{if(e.target.closest('a[href]'))closeDrawer(false);});
 document.addEventListener('keydown',e=>{
  if(drawer.hidden)return;
  if(e.key==='Escape'){e.preventDefault();closeDrawer();return;}
  if(e.key!=='Tab')return;
  const items=[...drawer.querySelectorAll('button:not([disabled]),a[href]')];if(!items.length)return;
  const first=items[0],last=items[items.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 });
 window.addEventListener('pageshow',()=>{if(!drawer.hidden)closeDrawer(false);});
})();
