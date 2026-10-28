/* Dome of Drums V19 — real fabrication mesh; website animation is illustrative only.
   All member geometry, family indices and cut data come from user's V34 reports. */
(()=>{'use strict';
const models=window.DOD_REAL_MODELS||[];if(!models.length)return;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const colors=['#D97935','#7B9975','#648FB5','#B17A9C','#B99D54','#7287AE','#D07F72','#7AA59D','#AD8B5D','#7D6D9C','#659B74','#CC9D5B','#557F98','#A3796B','#929B60','#BC8EAC'];
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)), mix=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
let modelIndex=0, selected=0, end='a', viewMode='auto', paused=false, manualUntil=0;
let progress=0, sequence={stage:'form',explode:0,extract:0,slot:0,inspect:false,page:0}, lastTick=0,spin=0, lastManual=0;
const model=()=>models[modelIndex], type=()=>model().types[selected];
// Only the requested representative families are showcased; the complete model and report remain untouched.
const shownFamilyCount=()=>Math.min(model().types.length,modelIndex===0?3:5);
const angleLabel=(value,decimals=2)=>Math.abs(Number(value)||0).toFixed(decimals)+'°';
const rawToDisplayed=models.map(m=>{const mp=new Map();m.types.forEach((t,i)=>mp.set(m.members[t.representative].type,i));return mp});
const familyIndex=member=>rawToDisplayed[modelIndex].get(member.type)??member.type;
const redrawText=(attr,str)=>$$(`[${attr}]`).forEach(x=>x.textContent=str);
function shade(col,amount){const n=parseInt(col.slice(1),16);return `rgb(${clamp((n>>16&255)*amount,0,255)|0},${clamp((n>>8&255)*amount,0,255)|0},${clamp((n&255)*amount,0,255)|0})`}
function faceLight(a,b,c){const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]], l=Math.hypot(...n)||1;return .79+.2*Math.abs((n[0]*.4-n[1]*.44+n[2]*.78)/l)}
function rot(p,y,r){const c=Math.cos(y),s=Math.sin(y),cp=Math.cos(r),sp=Math.sin(r);const x=p[0]*c-p[1]*s,d=p[0]*s+p[1]*c;return [x,p[2]*cp-d*sp,p[2]*sp+d*cp]}
function proj(p,w,h,z){const scale=Math.min(w*.95,h*1.36)*z/(3.4-p[2]);return [w*.5+p[0]*scale,h*.49-p[1]*scale]}
function cavg(face){return face.reduce((a,p)=>a.map((v,i)=>v+p[i]/face.length),[0,0,0])}
function hitpoly(poly,x,y){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){let p=poly[i],q=poly[j];if((p[1]>y)!=(q[1]>y)&&x<(q[0]-p[0])*(y-p[1])/(q[1]-p[1])+p[0])inside=!inside}return inside}
const reduced=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
function seqDur(){return [2400,3300,3300,1800,shownFamilyCount()*1450,1500]}
function evaluate(){
 const ds=seqDur(),d=ds.reduce((a,b)=>a+b,0),p=((progress%d)+d)%d;let n=p,k=0;
 while(k<ds.length-1&&n>=ds[k]){n-=ds[k];k++}
 const t=n/ds[k],stage=['form','separate','return','extract','inspect','reset'][k];
 let ex=0,extract=0,slot=0,inspect=stage==='inspect';
 if(stage==='separate')ex=smooth(t)*1.35;
 if(stage==='return')ex=(1-smooth(t))*1.35;
 if(stage==='extract')extract=smooth(t);
 if(stage==='inspect'){extract=1;slot=Math.min(shownFamilyCount()-1,Math.floor(t*shownFamilyCount()))}
 if(stage==='reset')extract=1-smooth(t);
 sequence={stage,explode:ex,extract,slot,inspect,page:0,percent:100*p/d};
 // The report inspector follows the same actual selected manufacturing family.
 if(inspect&&performance.now()>manualUntil){let sub=t*shownFamilyCount()-slot;let nextEnd=sub<.5?'a':'b';if(selected!==slot||end!==nextEnd){selected=slot;end=nextEnd;updateUI()}}
 const phase=$('[data-v19-phase]'),bar=$('[data-v19-progress]');
 if(phase)phase.textContent=({form:'01 / COMPLETE STRUCTURE',separate:'02 / SEPARATE BY MEMBER FAMILY',return:'03 / RETURN TO STRUCTURE',extract:'04 / EXTRACT ONE OF EACH FAMILY',inspect:`05 / CUT INSPECTION · ${type().id} · END ${end.toUpperCase()}`,reset:'06 / RETURN TO STRUCTURE'})[stage];
 if(bar)bar.style.width=sequence.percent.toFixed(2)+'%';
 const annotation=$('[data-v19-rack-note]');if(annotation)annotation.textContent=stage==='inspect'?`Actual family ${type().id} · End ${end.toUpperCase()} · Miter ${angleLabel(type()[end].miter)} · Bevel ${angleLabel(type()[end].bevel)}`:(stage==='extract'?'One representative of each real member family moves into view.':'The separation and extraction are website presentation effects, not manufacturing features.');
}
class View{
 constructor(el){this.el=el;this.kind=el.dataset.kind||'hero';this.ctx=el.getContext('2d');this.ry=.64;this.rx=.29;this.zoom=1;this.drag=false;this.dragged=false;this.pickFaces=[];this.pickCenters=[];this.last=[0,0];this.visible=true;
  el.addEventListener('pointerdown',e=>{this.drag=true;this.dragged=false;this.last=[e.clientX,e.clientY];try{el.setPointerCapture(e.pointerId)}catch(_){};lastManual=performance.now()});
  el.addEventListener('pointermove',e=>{if(!this.drag)return;let dx=e.clientX-this.last[0],dy=e.clientY-this.last[1];this.dragged||=(Math.abs(dx)+Math.abs(dy)>3);this.ry+=dx*.007;this.rx=clamp(this.rx+dy*.006,-1.3,1.3);this.last=[e.clientX,e.clientY];lastManual=performance.now()});
  el.addEventListener('pointerup',e=>{this.drag=false;if(!this.dragged&&this.kind==='hero'){
   const r=el.getBoundingClientRect(),x=(e.clientX-r.left)*(el.width/r.width),y=(e.clientY-r.top)*(el.height/r.height);
   for(const face of this.pickFaces){if(face.type<shownFamilyCount()&&hitpoly(face.scr,x,y)){selected=face.type;end='a';manualUntil=performance.now()+6500;updateUI();return}}
   let hit=null,dist=1600*(Math.min(window.devicePixelRatio||1,1.5)**2);for(const p of this.pickCenters){const d=(p.x-x)**2+(p.y-y)**2;if(d<dist){dist=d;hit=p}}if(hit&&hit.type<shownFamilyCount()){selected=hit.type;end='a';manualUntil=performance.now()+6500;updateUI()}
  }});
  el.addEventListener('pointercancel',()=>{this.drag=false});
  el.addEventListener('wheel',e=>{e.preventDefault();this.zoom=clamp(this.zoom*(e.deltaY>0?.94:1.08),.62,2.5);lastManual=performance.now()},{passive:false});
  if(window.IntersectionObserver)new IntersectionObserver(entries=>{this.visible=entries[0]?.isIntersecting||false},{threshold:.01}).observe(el);
 }
 size(){const r=this.el.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5);if(r.width<4||r.height<4)return false;const w=Math.round(r.width*d),h=Math.round(r.height*d);if(this.el.width!==w||this.el.height!==h){this.el.width=w;this.el.height=h}this.w=w;this.h=h;this.d=d;return true}
 render(){if(!this.ctx||!this.visible||!this.size())return;const ctx=this.ctx,w=this.w,h=this.h,only=this.kind==='cut',m=model(),tw=type();ctx.clearRect(0,0,w,h);
 const g=ctx.createRadialGradient(w*.48,h*.42,8,w*.5,h*.5,Math.max(w,h)*.8);g.addColorStop(0,'#f6faf4');g.addColorStop(1,'#cadbc9');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='rgba(88,121,89,.1)';ctx.lineWidth=1;for(let i=-8;i<=8;i++){const yy=h*.84+i*h*.043;ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(w,yy);ctx.stroke()}
 let specimen=only?m.members[tw.representative]:null;
 const cx=only?specimen.c:[0,0,0];let basis=null;
 if(only){const a=cavg(specimen.faces[tw.faceA]||specimen.faces[3]),b=cavg(specimen.faces[tw.faceB]||specimen.faces[4]);const unit=v=>{let d=Math.hypot(...v)||1;return v.map(x=>x/d)},cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];let axis=unit(b.map((v,i)=>v-a[i])),side=unit(cross(axis,[0,0,1]));if(Math.hypot(...side)<.01)side=[0,1,0];basis=[axis,side,unit(cross(side,axis))]}
 let isRack=!only&&sequence.extract>.0001&&viewMode==='auto';
 let visualExplosion=!only?(viewMode==='auto'?sequence.explode:viewMode==='separate'?1.35:0):0;
 let showFamily=!only&&(viewMode==='families'||(viewMode==='auto'&&visualExplosion>.008));
 const yy=this.ry+(only?0:spin),xx=this.rx,rr=sequence.extract;
 // Scale the dome to its viewport even at peak separation and with the family rack.
 const autoFit=only?1:(isRack?(1-.38*rr):1/(1+.56*visualExplosion));
 const projectWorld=(p,offset=[0,0,0])=>{let q=p.map((v,i)=>v-cx[i]+offset[i]);if(basis)q=basis.map(b=>b[0]*q[0]+b[1]*q[1]+b[2]*q[2]);const r=rot(q,yy,xx),out=proj(r,w,h,this.zoom*(only?5.6:.99)*autoFit);if(!only&&isRack)out[0]-=w*.145*rr;return out};
 const renderfaces=[],reps=[],repSet=new Set();if(isRack)m.types.slice(0,shownFamilyCount()).forEach(t=>repSet.add(t.representative));this.pickFaces=[];this.pickCenters=[];
 const members=only?[specimen]:m.members;
 for(let k=0;k<members.length;k++){
  const member=members[k];if(!member)continue;const mi=only?tw.representative:k;
  if(isRack&&repSet.has(mi)){reps.push({member,idx:mi});continue}
  const p=member.c,off=only?[0,0,0]:p.map(x=>x*visualExplosion);
  const color=only?colors[selected%colors.length]:showFamily&&familyIndex(member)<shownFamilyCount()?colors[familyIndex(member)%colors.length]:'#c8a174';
  for(let fi=0;fi<member.faces.length;fi++){
   const f=member.faces[fi],raw=f.map(q=>{const r=q.map((v,i)=>v-cx[i]+off[i]);return rot(basis?basis.map(b=>b[0]*r[0]+b[1]*r[1]+b[2]*r[2]):r,yy,xx)}),scr=f.map(q=>projectWorld(q,off));if(!raw.length)continue;
   const depth=raw.reduce((a,p)=>a+p[2],0)/raw.length,focus=familyIndex(member)===selected,cut=only&&fi===(end==='a'?tw.faceA:tw.faceB);
   renderfaces.push({scr,depth,type:familyIndex(member),color:shade(cut?'#E57C33':color,faceLight(raw[0],raw[1],raw[2])*(showFamily&&!only&&!focus?.72:1)),stroke:cut?'#efcfaf':'rgba(51,55,38,.24)',width:cut?2.6:.65})
  }
  if(!only){const pp=projectWorld(p,off);this.pickCenters.push({x:pp[0],y:pp[1],type:familyIndex(member)})}
 }
 renderfaces.sort((a,b)=>a.depth-b.depth);if(!only)this.pickFaces=renderfaces.slice().reverse();
 for(const p of renderfaces){ctx.beginPath();p.scr.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=p.color;ctx.fill();ctx.strokeStyle=p.stroke;ctx.lineWidth=p.width*this.d;ctx.stroke()}
 if(isRack)this.drawRack(ctx,m,reps,projectWorld,w,h,rr);
 if(!only){ctx.textAlign='center';ctx.font=`${10*this.d}px Arial`;ctx.fillStyle='#5a735d';ctx.fillText('ACTUAL V34 SKETCHUP MEMBERS · '+m.members.length+' PHYSICAL PARTS',w*.5,h-12*this.d)}
 }
 drawRack(ctx,m,reps,pr,w,h,t){
  const rows=shownFamilyCount(),page=0;
  // Show at most six real representative parts at once so 16 Zome families remain legible.
  const start=0,stop=shownFamilyCount(),visible=reps.filter(x=>familyIndex(x.member)>=start&&familyIndex(x.member)<stop);
  const upper=h*.13,lower=h*.85,rowH=(lower-upper)/Math.max(1,visible.length);
  const primary=sequence.inspect?sequence.slot:-1,bandX=w*.715;
  ctx.save();ctx.fillStyle=`rgba(255,255,255,${t*.83})`;ctx.strokeStyle=`rgba(104,128,102,${t*.7})`;ctx.lineWidth=1.2*this.d;
  const panelX=w*.66,panelY=h*.07,panelW=w*.33,panelH=h*.82;ctx.beginPath();ctx.roundRect(panelX,panelY,panelW,panelH,13*this.d);ctx.fill();ctx.stroke();
  if(t>.12){ctx.globalAlpha=t;ctx.fillStyle='#345340';ctx.textAlign='left';ctx.font=`700 ${11*this.d}px Arial`;ctx.fillText('MEMBER FAMILIES · TRUE PARTS',panelX+12*this.d,panelY+22*this.d);ctx.font=`${10*this.d}px Arial`;ctx.fillText(`${stop} FEATURED / ${m.types.length} TOTAL FAMILIES`,panelX+12*this.d,panelY+39*this.d);ctx.globalAlpha=1}
  for(const {member,idx} of visible){const fi=familyIndex(member),row=fi-start,ty=upper+(row+.5)*rowH;const color=colors[fi%colors.length],ca=pr(cavg(member.faces[m.types[fi].faceA])),cb=pr(cavg(member.faces[m.types[fi].faceB]));
   const angle=Math.atan2(cb[1]-ca[1],cb[0]-ca[0]),cs=Math.cos(angle),sn=Math.sin(angle);const dist=Math.hypot(cb[0]-ca[0],cb[1]-ca[1])||1;
   const len=Math.min(w*.21,165*this.d),factor=clamp(len/dist,.4,6);
   const center=pr(member.c),xx=bandX+w*.1;
   const polygons=[];
   for(let j=0;j<member.faces.length;j++){
    const face=member.faces[j],original=face.map(p=>pr(p)),to=original.map(([x,y])=>{const a=x-center[0],b=y-center[1];return [xx+(cs*a+sn*b)*factor,ty+(-sn*a+cs*b)*factor]});
    const scr=original.map((p,i)=>[mix(p[0],to[i][0],t),mix(p[1],to[i][1],t)]);
    polygons.push({scr,fill:shade(color,.87+(j%3)*.09),dep:Math.min(...original.map(p=>p[1]))});
   }
   for(const p of polygons){ctx.beginPath();p.scr.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=p.fill;ctx.fill();ctx.strokeStyle='rgba(27,40,31,.44)';ctx.lineWidth=.8*this.d;ctx.stroke()}
   if(t>.54){const alpha=(t-.54)/.46;ctx.save();ctx.globalAlpha=alpha;ctx.textAlign='left';ctx.fillStyle=fi===primary?'#c15c1a':'#375440';ctx.font=`700 ${10*this.d}px Arial`;ctx.fillText(m.types[fi].id.split('-').slice(0,1)[0],panelX+12*this.d,ty+3*this.d);ctx.font=`${9*this.d}px Arial`;ctx.fillText('×'+m.types[fi].count,panelX+12*this.d,ty+16*this.d);
    if(fi===primary){ctx.strokeStyle='#b75523';ctx.lineWidth=1.5*this.d;ctx.strokeRect(panelX+5*this.d,ty-rowH*.47,panelW-10*this.d,rowH*.94);
      // Endpoint annotation is a floating arrow, not a physical marker on the member.
      const side=end==='a'?-1:1,ex=xx+side*len*.56,ey=ty;ctx.strokeStyle='#B75523';ctx.beginPath();ctx.moveTo(ex,ey-10*this.d);ctx.lineTo(ex,ey-2*this.d);ctx.lineTo(ex-4*this.d,ey-7*this.d);ctx.moveTo(ex,ey-2*this.d);ctx.lineTo(ex+4*this.d,ey-7*this.d);ctx.stroke();
      const cut=m.types[fi][end];ctx.textAlign='right';ctx.fillStyle='#984c18';ctx.font=`700 ${8.5*this.d}px Arial`;ctx.fillText(`END ${end.toUpperCase()} · MIT ${angleLabel(cut.miter,1)} · BEV ${angleLabel(cut.bevel,1)}`,panelX+panelW-10*this.d,ty-rowH*.3);
    }ctx.restore()}
  }
  ctx.restore();
 }
}
const views=[];
function updateUI(){selected=clamp(selected,0,shownFamilyCount()-1);const m=model(),t=type();
 redrawText('data-v17-name',m.name);redrawText('data-v17-count',m.summary.member_count.toLocaleString());redrawText('data-v17-types',m.summary.type_count);redrawText('data-v17-cells',m.summary.cell_count);redrawText('data-v17-connection',m.subtitle);redrawText('data-v17-profile',m.profile);
 redrawText('data-v17-part',t.id);redrawText('data-v17-qty',t.count);redrawText('data-v17-length',t.length.toFixed(1)+' mm');redrawText('data-v17-dim',`${t.width} × ${t.thickness} mm`);
 $$('.v17-tab').forEach(b=>{const is=+b.dataset.modelIndex===modelIndex;b.classList.toggle('active',is);b.setAttribute('aria-selected',String(is))});
 for(const name of ['hero','handoff']){let host=$(`[data-v17-families="${name}"]`);if(!host)continue;host.replaceChildren();m.types.slice(0,shownFamilyCount()).forEach((v,i)=>{let b=document.createElement('button');b.className='v17-family'+(i===selected?' active':'');b.type='button';b.innerHTML=`<i style="background:${colors[i%colors.length]}"></i><span>${v.id}</span><small>×${v.count}</small>`;b.onclick=()=>{selected=i;end='a';manualUntil=performance.now()+6500;updateUI()};host.append(b)})}
 for(const e of ['a','b']){redrawText(`data-v17-${e}-mit`,angleLabel(t[e].miter));redrawText(`data-v17-${e}-bev`,angleLabel(t[e].bevel))}
 const cut=t[end];redrawText('data-v17-selected-end',`END ${end.toUpperCase()} · ${cut.classification}`);redrawText('data-v17-current-mit',angleLabel(cut.miter));redrawText('data-v17-current-bev',angleLabel(cut.bevel));$$('.v17-end').forEach(b=>b.classList.toggle('active',b.dataset.end===end));
 const shape=$('[data-v17-cut-shape]');if(shape&&cut.shape?.length>2){const pts=cut.shape,xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),w=Math.max(1,xmax-xmin),h=Math.max(1,ymax-ymin),sc=Math.min(175/w,88/h),text=pts.map(p=>`${110+(p[0]-(xmin+xmax)/2)*sc},${56-(p[1]-(ymin+ymax)/2)*sc}`).join(' ');shape.innerHTML=`<rect width="220" height="112" rx="8" fill="#f0ede4"/><line x1="110" y1="10" x2="110" y2="104" stroke="#9da49a" stroke-dasharray="4 5"/><polygon points="${text}" fill="${colors[selected%colors.length]}" stroke="#b75523" stroke-width="2"/>`}
 const holder=$('#v18-live-cut-inspection');if(holder)holder.style.setProperty('--part-color',colors[selected%colors.length]);
}
function selectModel(i){modelIndex=clamp(i,0,models.length-1);selected=0;end='a';progress=0;spin=0;manualUntil=0;updateUI();const iframe=$('#v17-native-frame');if(iframe&&iframe.dataset.loaded==='yes')iframe.src='/assets/reports/'+model().report}
function init(){
 $$('.v17-tab').forEach(b=>b.onclick=()=>selectModel(+b.dataset.modelIndex));
 $$('.v17-end').forEach(b=>b.onclick=()=>{end=b.dataset.end||'a';manualUntil=performance.now()+6500;updateUI()});
 $$('.v17-view-toggle').forEach(b=>b.onclick=()=>{viewMode=b.dataset.v17View;manualUntil=performance.now()+6500;$$('.v17-view-toggle').forEach(el=>el.classList.toggle('active',el===b));updateUI()});
 const autoplay=$('[data-v19-auto]');if(autoplay)autoplay.onclick=()=>{viewMode='auto';manualUntil=0;$$('.v17-view-toggle').forEach(el=>el.classList.remove('active'));autoplay.classList.add('active')};
 const pause=$('[data-v17-pause]');if(pause)pause.onclick=()=>{paused=!paused;pause.textContent=paused?'▶ Resume':'Ⅱ Pause'};
 const reset=$('[data-v17-reset]');if(reset)reset.onclick=()=>{progress=0;spin=0;viewMode='auto';selected=0;end='a';manualUntil=0;views.forEach(v=>{v.ry=.64;v.rx=.29;v.zoom=1});updateUI()};
 const full=$('[data-v17-fullscreen]');if(full)full.onclick=()=>$('#v17-top-view')?.requestFullscreen?.();
 $$('[data-v17-open-report]').forEach(b=>b.onclick=()=>{if(window.DOD_PREVIEW_REPORTS){window.DOD_OPEN_REPORT?.(modelIndex);return}window.open('/assets/reports/'+model().report,'_blank','noopener')});
 let load=$('[data-v17-load-report]');if(load)load.onclick=()=>{const iframe=$('#v17-native-frame');if(iframe){iframe.src='/assets/reports/'+model().report;iframe.dataset.loaded='yes';iframe.hidden=false;load.textContent='Reload current report'}};
 $$('.v17-canvas').forEach(c=>views.push(new View(c)));
 const rail=$('[data-v19-rail]');if(rail){rail.setAttribute('aria-label','Seek or restart the visual sequence');
 rail.onclick=e=>{const r=rail.getBoundingClientRect();progress=seqDur().reduce((a,b)=>a+b,0)*clamp((e.clientX-r.left)/Math.max(1,r.width),0,.999);viewMode='auto';manualUntil=0;$$('.v17-view-toggle').forEach(el=>el.classList.remove('active'));evaluate()};
 rail.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();progress=0;viewMode='auto';manualUntil=0;evaluate()}};
}
 let lastDraw=0;function frame(t){let dt=lastTick?Math.min(t-lastTick,90):0;lastTick=t;const active=$('#real-3d-preview')?.getBoundingClientRect();const onScreen=active&&(active.bottom>0&&active.top<innerHeight);
 if(!paused&&!reduced()&&onScreen){if(t>manualUntil&&viewMode==='auto')progress+=dt;if(t-lastManual>1700)spin+=dt*.0001125}
 if(t-lastDraw>=33){evaluate();views.forEach(v=>v.render());lastDraw=t}requestAnimationFrame(frame)}requestAnimationFrame(frame);
 updateUI();document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){selectModel((modelIndex+(e.key==='ArrowRight'?1:models.length-1))%models.length)}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.DOD_selectModel=selectModel;
})();
