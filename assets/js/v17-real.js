/* Dome of Drums V17 · models and cut values extracted from actual V34 fabrication reports.
   No geometry synthesized: each rendered face comes from a real, finished SketchUp member. */
(()=>{'use strict';
const MODELS=window.DOD_REAL_MODELS||[];if(!MODELS.length)return;
let current=0, family=0, mode='structure', end='a', exploded=false, paused=false, yaw=.64, pitch=.29, zoom=1, dragging=false, lastX=0,lastY=0,lastManual=0;
const $=(sel,root=document)=>root.querySelector(sel);const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
const cols=['#D97935','#7B9975','#648FB5','#B17A9C','#B99D54','#7287AE','#D07F72','#7AA59D','#AD8B5D','#7D6D9C','#659B74','#CC9D5B','#557F98','#A3796B','#929B60','#BC8EAC'];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), css=(el,text)=>{if(el)el.textContent=text};
const state={get model(){return MODELS[current]},get type(){return MODELS[current].types[family]||MODELS[current].types[0]}};
function tint(hex,amount){const n=parseInt(hex.slice(1),16);return `rgb(${clamp(((n>>16)&255)*amount,0,255)|0},${clamp(((n>>8)&255)*amount,0,255)|0},${clamp((n&255)*amount,0,255)|0})`}
function faceLight(a,b,c){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(...n)||1;return .77+.22*Math.abs((n[0]*.40+n[1]*-.44+n[2]*.78)/l)}
function rot(p,yaw,pitch){const c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);let x=p[0]*c-p[1]*s,d=p[0]*s+p[1]*c;return [x,p[2]*cp-d*sp,p[2]*sp+d*cp]}
function project(r,w,h,zoom){const scale=Math.min(w*1.0,h*1.4)*zoom/(3.4-r[2]);return [w*.5+r[0]*scale,h*.49-r[1]*scale]}
class View{
 constructor(canvas,kind){this.el=canvas;this.kind=kind;this.ctx=canvas.getContext('2d');this.w=0;this.h=0;this.dpr=1;this.drag=false;this.dragged=false;this.ry=yaw;this.rx=pitch;this.zoom=1;this.pick=[];this.pickFaces=[];this.visible=true;
  if(!this.ctx)return;
  canvas.addEventListener('pointerdown',e=>{this.drag=true;this.dragged=false;this.last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);lastManual=performance.now();});
  canvas.addEventListener('pointermove',e=>{if(!this.drag)return;let dx=e.clientX-this.last[0],dy=e.clientY-this.last[1];if(Math.abs(dx)+Math.abs(dy)>2)this.dragged=true;this.ry+=dx*.007;this.rx=clamp(this.rx+dy*.006,-1.32,1.32);this.last=[e.clientX,e.clientY];lastManual=performance.now()});
  canvas.addEventListener('pointerup',e=>{this.drag=false;if(!this.dragged&&this.kind!=='cut'&&this.pick.length){const rect=canvas.getBoundingClientRect(),mx=(e.clientX-rect.left)*this.w/rect.width,my=(e.clientY-rect.top)*this.h/rect.height;let hit=null,dist=Infinity;
   // Prefer a real projected timber face over center-distance picking.
   const inside=(poly,x,y)=>{let c=false;for(let a=0,b=poly.length-1;a<poly.length;b=a++){const p=poly[a],q=poly[b];if((p[1]>y)!==(q[1]>y)&&x<(q[0]-p[0])*(y-p[1])/(q[1]-p[1])+p[0])c=!c}return c};
   for(const face of this.pickFaces){if(inside(face.scr,mx,my)){family=face.type;updateUI();return}}
   for(let p of this.pick){let d=(p.x-mx)**2+(p.y-my)**2;if(d<dist){dist=d;hit=p}}if(hit&&dist<1900){family=hit.type;updateUI()} }});
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=clamp(this.zoom*(e.deltaY>0?.93:1.08),.65,2.6);lastManual=performance.now()},{passive:false});
  if(window.IntersectionObserver)new IntersectionObserver(entries=>{this.visible=entries[0]?.isIntersecting??true},{threshold:.01}).observe(canvas);
 }
 size(){let r=this.el.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.5);if(r.width<2||r.height<2)return false;let w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(this.el.width!==w||this.el.height!==h){this.el.width=w;this.el.height=h}this.w=w;this.h=h;this.dpr=dpr;return true}
 render(t){if(!this.ctx||!this.visible||!this.size())return;const ctx=this.ctx,w=this.w,h=this.h,dark=document.documentElement.dataset.theme==='dark';ctx.clearRect(0,0,w,h);
  let gradient=ctx.createRadialGradient(w*.52,h*.45,10,w*.5,h*.5,Math.max(w,h)*.8);gradient.addColorStop(0,'#f4f8f1');gradient.addColorStop(1,'#c8d8c9');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(92,123,91,.11)';ctx.lineWidth=1;for(let i=-8;i<=8;i++){let y=h*.83+i*h*.042;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  const active=state.model;
  const only=this.kind==='cut';let mem=only?[active.members[state.type.representative]]:active.members;
  const cx=only?mem[0].c:[0,0,0];
  let basis=null;
  if(only&&mem[0]){
    let f1=mem[0].faces[state.type.faceA]||mem[0].faces[3];
    let f2=mem[0].faces[state.type.faceB]||mem[0].faces[4];
    let avg=f=>f.reduce((a,p)=>a.map((v,i)=>v+p[i]/f.length),[0,0,0]);
    let A=avg(f1),B=avg(f2),axis=B.map((v,i)=>v-A[i]);
    const normal=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l)};
    const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    axis=normal(axis);let side=normal(cross(axis,[0,0,1]));if(Math.hypot(...side)<.01)side=[0,1,0];
    let up=normal(cross(side,axis));basis=[axis,side,up];
  }
  let yy=this.ry+(only?0:(!paused&&!this.drag&&performance.now()-lastManual>1700?t*.0001125:0));let xx=this.rx;
  let amount=mode==='separate'&&!only?(.32+.26*Math.sin(t*.000645)):(mode==='families'&&!only?.07:0);
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)amount=0;
  const polys=[],points=[];this.pick=[];this.pickFaces=[];
  mem.forEach((m,mi)=>{if(!m)return;const color=(only||m.type===family)?cols[m.type%cols.length]:(mode==='structure'?'#c8a174':cols[m.type%cols.length]);
    let c=m.c;
    let offset=only?[0,0,0]:[c[0]*amount,c[1]*amount,c[2]*amount];
    const transformed=[];
    for(let fi=0;fi<m.faces.length;fi++){
      let f=m.faces[fi],v=f.map(p=>{
        const q=[p[0]-cx[0]+offset[0],p[1]-cx[1]+offset[1],p[2]-cx[2]+offset[2]];
        if(basis)return rot(basis.map(b=>b[0]*q[0]+b[1]*q[1]+b[2]*q[2]),yy,xx);
        return rot(q,yy,xx);
      });
      let scr=v.map(p=>project(p,w,h,this.zoom*(only?5.8:1.1)));
      let depth=v.reduce((a,p)=>a+p[2],0)/v.length;
      let lit=faceLight(v[0],v[1],v[2]);
      let faceIsCut=only&&fi===(end==='a'?state.type.faceA:state.type.faceB);
      let isFocused=m.type===family;
      let baseColor=faceIsCut?'#e57c33':color;
      polys.push({scr,depth,type:m.type,fill:tint(baseColor,lit*(mode!=='structure'&&!only&&!isFocused?.58:1)),stroke:faceIsCut?'#f8d0a9':(dark?'rgba(6,12,8,.27)':'rgba(50,43,30,.29)'),width:faceIsCut?2.6:0.7});
    }
    if(!only){const pr=project(rot([c[0]+offset[0],c[1]+offset[1],c[2]+offset[2]],yy,xx),w,h,this.zoom);this.pick.push({x:pr[0],y:pr[1],type:m.type})}
  });
  polys.sort((a,b)=>a.depth-b.depth);if(!only)this.pickFaces=polys.slice().reverse();for(const p of polys){ctx.beginPath();p.scr.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=p.fill;ctx.fill();ctx.strokeStyle=p.stroke;ctx.lineWidth=p.width*this.dpr;ctx.stroke()}
  if(this.kind!=='cut'){ctx.textAlign='center';ctx.font=`${11*this.dpr}px Arial`;ctx.fillStyle=dark?'#a7b8a7':'#67786b';ctx.fillText('ACTUAL SKETCHUP MEMBER MESH · '+active.members.length+' MEMBERS',w*.5,h-18*this.dpr)}
 }
}
const views=[];
function updateStats(){let m=state.model;$$('[data-v17-name]').forEach(x=>css(x,m.name));$$('[data-v17-count]').forEach(x=>css(x,m.summary.member_count.toLocaleString()));$$('[data-v17-types]').forEach(x=>css(x,m.summary.type_count));$$('[data-v17-cells]').forEach(x=>css(x,m.summary.cell_count));$$('[data-v17-connection]').forEach(x=>css(x,m.subtitle));$$('[data-v17-profile]').forEach(x=>css(x,m.profile));
 let t=state.type;$$('[data-v17-part]').forEach(x=>css(x,t.id));$$('[data-v17-qty]').forEach(x=>css(x,t.count));$$('[data-v17-length]').forEach(x=>css(x,t.length.toFixed(1)+' mm'));
 $$('[data-v17-dim]').forEach(x=>css(x,`${t.width} × ${t.thickness} mm`));
 $$('.v17-tab').forEach(x=>{let selected=+x.dataset.modelIndex===current;x.classList.toggle('active',selected);x.setAttribute('aria-selected',String(selected))});
 ['hero','handoff'].forEach(id=>{let host=$(`[data-v17-families="${id}"]`);if(!host)return;host.replaceChildren();m.types.forEach((t,i)=>{let b=document.createElement('button');b.className='v17-family'+(i===family?' active':'');b.innerHTML=`<i style="background:${cols[i%cols.length]}"></i><span>${t.id}</span><small>×${t.count}</small>`;b.type='button';b.onclick=()=>{family=i;updateUI()};host.append(b)})});
 ['a','b'].forEach(e=>{let tcut=t[e];css($(`[data-v17-${e}-mit]`),`${tcut.miter.toFixed(2)}°`);css($(`[data-v17-${e}-bev]`),`${tcut.bevel.toFixed(2)}°`)});
 const cut=t[end];css($('[data-v17-selected-end]'),`END ${end.toUpperCase()} · ${cut.classification}`);css($('[data-v17-current-mit]'),`${cut.miter.toFixed(2)}°`);css($('[data-v17-current-bev]'),`${cut.bevel.toFixed(2)}°`);
 $$('.v17-end').forEach(x=>x.classList.toggle('active',x.dataset.end===end));
 // true cut-face outline from the engineering field stored in the original report
 let shape=$('[data-v17-cut-shape]');if(shape){let poly=cut.shape||[];if(poly.length>2){const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),w=Math.max(1,xmax-xmin),h=Math.max(1,ymax-ymin),scale=Math.min(175/w,88/h);const pts=poly.map(p=>`${110+(p[0]-(xmin+xmax)/2)*scale},${56-(p[1]-(ymin+ymax)/2)*scale}`).join(' ');shape.innerHTML=`<rect width="220" height="112" rx="8" fill="#f0ede4"/><line x1="110" y1="10" x2="110" y2="104" stroke="#9da49a" stroke-dasharray="4 5"/><polygon points="${pts}" fill="${cols[family%cols.length]}" stroke="#b75523" stroke-width="3"/>`}}}
function updateUI(){family=clamp(family,0,state.model.types.length-1);updateStats()}
function selectModel(i){current=clamp(i,0,MODELS.length-1);family=0;end='a';updateUI();let ifr=$('#v17-native-frame');if(ifr&&ifr.dataset.loaded==='yes'){ifr.src='/assets/reports/'+state.model.report}}
function init(){
 $$('.v17-tab').forEach(x=>x.addEventListener('click',()=>selectModel(+x.dataset.modelIndex)));
 $$('.v17-end').forEach(x=>x.addEventListener('click',()=>{end=x.dataset.end||'a';updateUI()}));
 $$('.v17-view-toggle').forEach(x=>x.addEventListener('click',()=>{mode=x.dataset.v17View;x.parentNode.querySelectorAll('.v17-view-toggle').forEach(el=>el.classList.toggle('active',el===x));updateUI()}));
 let pause=$('[data-v17-pause]');if(pause)pause.onclick=()=>{paused=!paused;pause.textContent=paused?'▶ Play':'Ⅱ Pause'};
 let reset=$('[data-v17-reset]');if(reset)reset.onclick=()=>{views.forEach(v=>{v.rx=.29;v.ry=.64;v.zoom=1});lastManual=performance.now()};
 let full=$('[data-v17-fullscreen]');if(full)full.onclick=()=>{$('#v17-top-view')?.requestFullscreen?.()};
 $$('[data-v17-open-report]').forEach(reports=>reports.onclick=()=>{
   if(window.DOD_PREVIEW_REPORTS){window.DOD_OPEN_REPORT?.(current);return}
   window.open('/assets/reports/'+state.model.report,'_blank','noopener')});
 let load=$('[data-v17-load-report]');if(load)load.onclick=()=>{let iframe=$('#v17-native-frame');if(iframe){iframe.src='/assets/reports/'+state.model.report;iframe.dataset.loaded='yes';iframe.hidden=false;load.textContent='Reload current report'}};
 $$('.v17-canvas').forEach(can=>views.push(new View(can,can.dataset.kind||'hero')));
 let lastFrame=0;function frame(t){if(t-lastFrame>=30){for(let v of views)v.render(t);lastFrame=t}requestAnimationFrame(frame)}requestAnimationFrame(frame);updateUI();
 document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){let i=(current+(e.key==='ArrowRight'?1:MODELS.length-1))%MODELS.length;selectModel(i)}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.DOD_selectModel=selectModel;
})();
