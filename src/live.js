const D=__DATA__;
const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
const stage=$('.stage'),layer=$('.ship-items'),view=$('.view-transform'),svg=$('.drawing');
const range=$('#separation'),percent=$('[data-percent]'),readout=$('[data-readout]');
const info=$('[data-info]'),live=$('[data-live]'),clearButton=$('[data-clear]');
const partButtons=$$('.part'),filterButtons=$$('.filter');
const still=matchMedia('(prefers-reduced-motion: reduce)'),narrow=matchMedia('(max-width:760px)');
const IDS=Object.keys(D.parts),CHANNELS=Object.keys(D.channels);
const motion={x:0,v:0};
let shares=sharesAt(0,D.stagger,D.spring.phase);
const nodes=[...layer.children].map((el,index)=>{
  const m=el.dataset.m.split(',').map(Number);
  return {el,index,piece:el.dataset.piece,ride:el.dataset.ride,key:Number(el.dataset.k),m,lift:m.reduce((s,v,i)=>s+v*D.V[i],0),shown:'',box:el.getBBox(),dx:0,dy:0};
});
let order=nodes.map((_,i)=>i),clock=0,frame=0,last=0,visible=true;
let target=0,held=null,pinned=null,preview=null,filter='all',inside=false,blocked=false;
let drag=null,leaveTimer=0,announceTimer=0,touring=false,tourClock=0,tourStep=-1;
let focused=false;
const camera={x:D.center[0],y:D.center[1],scale:1.6};
const clamp=v=>Math.max(0,Math.min(1,v));
const average=()=>motion.x;
const eligible=id=>Boolean(id)&&D.parts[id]&&(filter==='all'||D.parts[id].systems.includes(filter));
const currentPart=()=>pinned||preview;
function announce(text){clearTimeout(announceTimer);announceTimer=setTimeout(()=>{live.textContent=text;},220);}
function stopTour(){if(!touring)return;touring=false;$('[data-tour]').setAttribute('aria-pressed','false');$('[data-tour]').setAttribute('aria-label','Start guided loop');}

function setProgress(value){
  const next=clamp(value);if(Math.abs(next-target)<1e-7)return;
  target=next;
  range.setAttribute('aria-valuetext',`${Math.round(next*100)} percent${next===0?', assembled':next===1?', fully separated':''}`);
  if(still.matches||!visible){motion.x=next;motion.v=0;place();}
  run();
}
function reconcile(){
  setProgress(held!==null?held:(inside||preview||pinned?1:0));
  updateSelection();
}
function updateSelection(){
  const selected=currentPart();
  $('[data-tour]').disabled=still.matches;
  if(!selected)focused=false;
  $('[data-inspect]').disabled=!selected;
  $('[data-inspect]').setAttribute('aria-pressed',String(focused));
  $('[data-inspect]').setAttribute('aria-label',focused?'Return to whole vehicle':'Inspect selected assembly');
  $('[data-inspect]').title=selected?(focused?'Return to whole vehicle':'Inspect selected assembly'):'Select an assembly to inspect its details';
  stage.toggleAttribute('data-focus',!!selected);
  stage.toggleAttribute('data-filtering',!selected&&filter!=='all');
  stage.dataset.selected=selected||'';stage.dataset.pinned=pinned||'';stage.dataset.filter=filter;
  for(const node of nodes)node.el.toggleAttribute('data-on',selected?node.piece===selected:filter!=='all'&&eligible(node.piece));
  for(const b of partButtons){b.toggleAttribute('data-on',b.dataset.part===selected);b.setAttribute('aria-pressed',String(b.dataset.part===pinned));b.hidden=!eligible(b.dataset.part);}
  filterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
  const count=IDS.filter(eligible).length;$('[data-filter-count]').textContent=`${count} ${count===1?'assembly':'assemblies'}`;
  $('[data-selection-state]').textContent=pinned?'LOCKED SELECTION':selected?'ASSEMBLY PREVIEW':filter!=='all'?'SYSTEM OVERVIEW':'VEHICLE OVERVIEW';
  clearButton.hidden=!pinned;
  $('[data-index-hint]').textContent=pinned?'Click again to release':'Click to lock';
  $('[data-view-label]').textContent=selected?D.parts[selected].name:filter!=='all'?D.systems.find(s=>s[0]===filter)[1]:target===0?'Complete vehicle':'Structural separation';
  $('[data-control-state]').textContent=touring?'Guided loop':drag?.active?'Drag to adjust':held!==null?'Position held':inside||preview?'Temporary preview':'Hover to preview';
  run();
  if(info.dataset.part===(selected||`overview:${filter}`))return;
  info.dataset.part=selected||`overview:${filter}`;
  if(selected){
    const p=D.parts[selected];
    info.innerHTML=`<h2>${p.name}</h2><p class="subtitle">${p.subtitle}</p><p>${p.description}</p><p class="relationship">${p.relation}</p><div class="adjacent">${p.adjacent.map(id=>`<button data-adjacent="${id}">${D.parts[id].short} ↗</button>`).join('')}</div><p class="evidence"><strong>${p.evidence}.</strong> ${p.detail}</p>`;
  }else{
    const title=filter==='all'?'Built as one system.':D.systems.find(s=>s[0]===filter)[1];
    const copy={all:'A stainless-steel spacecraft with a protected windward face, four aerodynamic flaps and a six-engine propulsion system.',propulsion:'The three central engines and three large vacuum bells feed thrust into the aft structure.',fluids:'Two main cryogenic propellants occupy adjoining load-bearing tank sections. Their geometry is shown schematically.',structure:'Shell, pressure-bearing barrel, frames and thermal protection form the vehicle’s structural envelope.',attitude:'Aerodynamic surfaces, powered thrust and reaction control work in different flight environments.',payload:'Accommodation and support hardware occupy the forward volume above the propellant tanks.'}[filter];
    info.innerHTML=`<h2>${title}</h2><p>${copy}</p>${filter==='all'?'<div class="overview-stats"><div><strong>52 <small>m</small></strong><span>HEIGHT</span></div><div><strong>9 <small>m</small></strong><span>DIAMETER</span></div><div><strong>3+3</strong><span>ENGINES</span></div></div>':''}<p class="overview-instruction">${filter==='all'?'Hover to open the structure. Select a module to see its role and its connections.':'Select a highlighted assembly to inspect its role and neighboring systems.'}</p><p class="evidence">Public envelope from SpaceX. Internal dimensions and separation paths are illustrative. Use Design reference for the source boundary.</p>`;
  }
}
function previewPart(id){if(pinned)return;preview=eligible(id)?id:null;reconcile();}
function pinPart(id){
  if(!D.parts[id])return;stopTour();clearTimeout(leaveTimer);blocked=false;
  if(pinned===id){pinned=null;preview=null;}else{filter=eligible(id)?filter:'all';pinned=id;preview=null;held=1;}
  reconcile();announce(pinned?`${D.parts[pinned].name}, selection locked.`:'Selection released.');
}
function reset(){
  stopTour();clearTimeout(leaveTimer);pinned=null;preview=null;filter='all';held=null;inside=false;blocked=true;focused=false;
  setProgress(0);updateSelection();announce('Complete vehicle. All systems. Reassembled.');
}
function place(dt=1/60){
  shares=sharesAt(clamp(motion.x),D.stagger,D.spring.phase);
  for(const n of nodes){
    const share=shares[n.ride]||0;
    const dx=(D.EX[0]*n.m[0]+D.EY[0]*n.m[1]+D.EZ[0]*n.m[2])*share;
    const dy=(D.EX[1]*n.m[0]+D.EY[1]*n.m[1]+D.EZ[1]*n.m[2])*share;
    n.dx=dx;n.dy=dy;
    const transform=share===0?'':`translate(${dx.toFixed(3)} ${dy.toFixed(3)})`;
    if(transform!==n.shown){n.shown=transform;if(transform)n.el.setAttribute('transform',transform);else n.el.removeAttribute('transform');}
  }
  const next=nodes.map((_,i)=>i).sort((a,b)=>nodes[a].key+nodes[a].lift*(shares[nodes[a].ride]||0)-nodes[b].key-nodes[b].lift*(shares[nodes[b].ride]||0));
  if(next.some((id,i)=>id!==order[i])){const fragment=document.createDocumentFragment();for(const id of next)fragment.appendChild(nodes[id].el);layer.appendChild(fragment);order=next;}
  const share=clamp(average());
  let scale=1.6-.48*share,cx=D.center[0],cy=D.center[1],bounds=null;
  if(!focused){
    const c=Math.cos(Math.PI/10),s=Math.sin(Math.PI/10);
    const corners=nodes.flatMap(n=>[[n.box.x+n.dx,n.box.y+n.dy],[n.box.x+n.box.width+n.dx,n.box.y+n.dy],[n.box.x+n.dx,n.box.y+n.box.height+n.dy],[n.box.x+n.box.width+n.dx,n.box.y+n.box.height+n.dy]])
      .map(([x,y])=>[x*c-y*s,x*s+y*c]);
    const x0=Math.min(...corners.map(p=>p[0])),x1=Math.max(...corners.map(p=>p[0]));
    const y0=Math.min(...corners.map(p=>p[1])),y1=Math.max(...corners.map(p=>p[1]));
    bounds={x0,x1,y0,y1};
    const rx=(x0+x1)/2,ry=(y0+y1)/2;cx=rx*c+ry*s;cy=-rx*s+ry*c;
    scale=Math.min(scale,(narrow.matches?550:800)/(x1-x0),740/(y1-y0));
  }
  if(focused&&currentPart()){
    const active=nodes.filter(n=>n.piece===currentPart());
    const x0=Math.min(...active.map(n=>n.box.x+n.dx)),x1=Math.max(...active.map(n=>n.box.x+n.box.width+n.dx));
    const y0=Math.min(...active.map(n=>n.box.y+n.dy)),y1=Math.max(...active.map(n=>n.box.y+n.box.height+n.dy));
    cx=(x0+x1)/2;cy=(y0+y1)/2;
    const c=Math.cos(Math.PI/10),s=Math.sin(Math.PI/10),w=(x1-x0)*c+(y1-y0)*s,h=(x1-x0)*s+(y1-y0)*c;
    scale=Math.min(8,(narrow.matches?490:650)/Math.max(1,w),650/Math.max(1,h));
  }
  const amount=still.matches||!visible?1:1-Math.exp(-dt/.22);
  camera.x+=(cx-camera.x)*amount;camera.y+=(cy-camera.y)*amount;camera.scale+=(scale-camera.scale)*amount;
  if(bounds){
    const c=Math.cos(Math.PI/10),s=Math.sin(Math.PI/10),rx=camera.x*c-camera.y*s,ry=camera.x*s+camera.y*c;
    const fit=Math.min((narrow.matches?550:800)/2/Math.max(rx-bounds.x0,bounds.x1-rx),370/Math.max(ry-bounds.y0,bounds.y1-ry));
    // Zoom out with the moving surface bounds; easing may only lag a zoom in.
    // Both the bound and the spring path are continuous, so this never pops.
    camera.scale=Math.min(camera.scale,scale,fit);
  }
  const cameraMoving=Math.abs(camera.x-cx)+Math.abs(camera.y-cy)+Math.abs(camera.scale-scale)>.005;
  if(!cameraMoving)Object.assign(camera,{x:cx,y:cy,scale});
  view.setAttribute('transform',`translate(${D.W/2} ${D.H/2}) rotate(18) scale(${camera.scale.toFixed(5)}) translate(${-camera.x} ${-camera.y})`);
  const pct=Math.round(share*100);percent.textContent=String(pct).padStart(2,'0');
  if(document.activeElement!==range&&!drag)range.value=String(pct);
  range.style.setProperty('--range',`${pct}%`);stage.dataset.progress=share.toFixed(5);
  const moving=Math.abs(motion.x-target)>.001||Math.abs(motion.v)>.001;
  const mode=moving?(target>share?'Separating':'Reassembling'):share<.002?'Assembled':share>.998?'Exploded':`${pct}% separated`;
  readout.textContent=pinned?`${mode} · locked`:mode;stage.dataset.settled=String(!moving);
  $('[data-explode]').setAttribute('aria-label',target>.5?'Close all assemblies':'Open all assemblies');
  stage.dataset.focused=String(focused);
  return cameraMoving;
}
function tick(now){
  const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;clock+=dt;
  if(touring){
    tourClock+=dt;const t=tourClock%24;
    const index=t<2?0:t<5?1:t<9?2:t<13?3:t<17?4:t<21?5:6;
    if(index!==tourStep){tourStep=index;held=index===0||index===6?0:1;pinned=null;preview=[null,null,'methane','aft','sea','rear',null][index];reconcile();}
  }
  let moving=advanceSpring(motion,target,dt,D.spring,still.matches);moving=place(dt)||moving;
  frame=visible&&!document.hidden&&(moving||touring)?requestAnimationFrame(tick):0;
}
function run(){if(!frame&&visible&&!document.hidden){last=0;frame=requestAnimationFrame(tick);}}
new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;if(visible)run();},{rootMargin:'80px 0px'}).observe(stage);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)run();});

function hitPart(event){const el=document.elementFromPoint(event.clientX,event.clientY)?.closest('.it');return el&&eligible(el.dataset.piece)?el.dataset.piece:null;}
let pointerX=0,pointerY=0;
document.addEventListener('pointermove',event=>{if(Math.hypot(event.clientX-pointerX,event.clientY-pointerY)>1)blocked=false;pointerX=event.clientX;pointerY=event.clientY;},{capture:true});
stage.addEventListener('pointerenter',event=>{if(event.pointerType==='touch'||blocked)return;stopTour();inside=true;clearTimeout(leaveTimer);reconcile();});
stage.addEventListener('pointermove',event=>{
  if(drag&&event.pointerId===drag.id){
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.active&&Math.abs(dx)>6&&Math.abs(dx)>Math.abs(dy)*1.15){drag.active=true;stage.classList.add('dragging');stage.setPointerCapture(event.pointerId);}
    if(drag.active){stopTour();held=clamp(drag.start+dx/Math.max(180,stage.clientWidth*.58));preview=null;setProgress(held);updateSelection();}
    return;
  }
  if(event.pointerType==='touch'||blocked)return;
  stopTour();inside=true;clearTimeout(leaveTimer);if(!pinned)previewPart(hitPart(event));else reconcile();
});
stage.addEventListener('pointerleave',()=>{
  blocked=false;if(drag?.active)return;inside=false;
  clearTimeout(leaveTimer);leaveTimer=setTimeout(()=>{if(inside||drag)return;preview=null;reconcile();},180);
});
stage.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;stopTour();clearTimeout(leaveTimer);
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,start:held??average(),active:false,part:hitPart(event)};
});
function finishDrag(event,canceled=false){
  if(!drag||event.pointerId!==drag.id)return;
  const previous=drag;drag=null;stage.classList.remove('dragging');
  if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
  if(previous.active){updateSelection();announce(`${Math.round(target*100)} percent separated. Position held.`);}
  else if(!canceled){if(previous.part)pinPart(previous.part);else if(event.pointerType==='touch'){held=target>.5?0:1;preview=null;reconcile();}}
}
stage.addEventListener('pointerup',e=>finishDrag(e));
stage.addEventListener('pointercancel',e=>finishDrag(e,true));
window.addEventListener('pointerup',e=>{if(drag)finishDrag(e,true);});

for(const b of partButtons){
  const hoverPart=event=>{if(event.pointerType==='touch'||pinned||blocked)return;stopTour();clearTimeout(leaveTimer);previewPart(b.dataset.part);};
  b.addEventListener('pointerenter',hoverPart);b.addEventListener('pointermove',hoverPart);
  b.addEventListener('pointerleave',()=>{clearTimeout(leaveTimer);leaveTimer=setTimeout(()=>{if(!inside&&!pinned){preview=null;reconcile();}},160);});
  b.addEventListener('focus',()=>{if(!pinned){stopTour();previewPart(b.dataset.part);}});
  b.addEventListener('blur',()=>{if(!pinned){preview=null;reconcile();}});
  b.addEventListener('click',()=>pinPart(b.dataset.part));
}
info.addEventListener('click',event=>{const b=event.target.closest('[data-adjacent]');if(b)pinPart(b.dataset.adjacent);});
clearButton.addEventListener('click',()=>{pinned=null;preview=null;updateSelection();run();announce('Selection released.');});
filterButtons.forEach(b=>b.addEventListener('click',()=>{
  stopTour();filter=b.dataset.filter;pinned=null;preview=null;held=1;reconcile();
  announce(`${D.systems.find(s=>s[0]===filter)[1]}. ${IDS.filter(eligible).length} assemblies.`);
}));
range.addEventListener('input',()=>{stopTour();held=Number(range.value)/100;preview=null;setProgress(held);updateSelection();clearTimeout(announceTimer);announceTimer=setTimeout(()=>{live.textContent=`${Math.round(target*100)} percent separated.`;},700);});
range.addEventListener('change',()=>announce(`${Math.round(target*100)} percent separated. Position held.`));
$('[data-reset]').addEventListener('click',reset);
$('[data-inspect]').addEventListener('click',()=>{stopTour();if(!currentPart())return;if(!pinned)pinPart(currentPart());focused=!focused;updateSelection();run();announce(focused?`Detail view of ${D.parts[currentPart()].name}.`:'Whole vehicle view.');});
$('[data-explode]').addEventListener('click',()=>{stopTour();held=target>.5?0:1;preview=null;if(held===0)pinned=null;reconcile();announce(held?'All assemblies open.':'Complete vehicle.');});
$('[data-tour]').addEventListener('click',()=>{
  if(still.matches)return;
  if(touring){stopTour();held=target;preview=null;updateSelection();return;}
  touring=true;tourClock=0;tourStep=-1;pinned=null;preview=null;filter='all';
  $('[data-tour]').setAttribute('aria-pressed','true');$('[data-tour]').setAttribute('aria-label','Stop guided loop');updateSelection();run();announce('Guided loop started. Interact to stop.');
});

stage.addEventListener('keydown',event=>{
  const key=event.key;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter',' ','Escape'].includes(key))return;
  event.preventDefault();stopTour();clearTimeout(leaveTimer);blocked=true;inside=false;
  if(key==='Escape'){reset();return;}
  if(key==='ArrowLeft'||key==='ArrowRight'){held=clamp((held??average())+(key==='ArrowRight'?1:-1)*(event.shiftKey?.25:.1));setProgress(held);updateSelection();announce(`${Math.round(target*100)} percent separated.`);return;}
  if(key==='Home'||key==='End'||key===' '){held=key==='Home'?0:key==='End'?1:target>.5?0:1;if(!held){preview=null;pinned=null;}reconcile();announce(held?'All assemblies open.':'Complete vehicle.');return;}
  if(key==='Enter'){const id=currentPart()||IDS.filter(eligible)[0];pinPart(id);return;}
  const ids=IDS.filter(eligible),index=ids.indexOf(currentPart());pinned=null;preview=ids[index===-1?(key==='ArrowDown'?0:ids.length-1):(index+(key==='ArrowDown'?1:-1)+ids.length)%ids.length];held=1;reconcile();announce(`${D.parts[preview].name}. Press Enter to lock.`);
});
stage.addEventListener('focus',()=>announce(`${readout.textContent}. Arrow keys explore. Escape reassembles.`));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented&&!event.target.closest('dialog')&&!$('dialog[open]')){event.preventDefault();reset();}});

$$('[data-dialog]').forEach(b=>b.addEventListener('click',()=>{stopTour();$(`#${b.dataset.dialog}`).showModal();}));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$$('dialog').forEach(d=>{
  d.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();d.close();}});
  d.addEventListener('click',event=>{if(event.target===d){const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();}});
});
$('[data-theme-toggle]').addEventListener('click',()=>{
  const theme=document.body.dataset.theme==='light'?'dark':'light';document.body.dataset.theme=theme;
  $('[data-theme-toggle]').setAttribute('aria-label',`Switch to ${theme==='light'?'dark':'light'} theme`);
});
function accessibility(){
  $('[data-theme-toggle]').setAttribute('aria-label',`Switch to ${document.body.dataset.theme==='light'?'dark':'light'} theme`);
  const b=$('[data-tour]');b.disabled=still.matches;b.title=still.matches?'Guided loop is disabled for reduced motion':'Guided loop';
  if(still.matches){stopTour();motion.x=target;motion.v=0;place();}
  svg.setAttribute('viewBox',narrow.matches?'140 0 640 900':`0 0 ${D.W} ${D.H}`);
}
still.addEventListener('change',accessibility);narrow.addEventListener('change',accessibility);
// Read-only diagnostics expose model state to repeatable browser acceptance checks.
window.starshipState=()=>({target,progress:average(),held,pinned,preview,filter,touring,focused,visible,reduced:still.matches,shares:{...shares}});
accessibility();updateSelection();place();
