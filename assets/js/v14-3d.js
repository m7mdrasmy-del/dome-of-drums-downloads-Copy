/* Dome of Drums V14 — engineering sequence + synchronized fabrication handoff.
   Temporary reference geometry only; intended to be replaced by a native Dome of Drums export.
   No external libraries, so the preview works from file:// and on mobile. */
(()=>{
  'use strict';
  const TAU=Math.PI*2, PHI=(1+Math.sqrt(5))/2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
  const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
  const mul=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
  const len=a=>Math.hypot(a.x,a.y,a.z);
  const norm=a=>{const l=len(a)||1;return {x:a.x/l,y:a.y/l,z:a.z/l}};
  const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  const angleDeg=(u,v)=>Math.acos(clamp(dot(norm(u),norm(v)),-1,1))*180/Math.PI;
  const mix3=(a,b,c,wa,wb,wc)=>norm({x:a.x*wa+b.x*wb+c.x*wc,y:a.y*wa+b.y*wb+c.y*wc,z:a.z*wa+b.z*wb+c.z*wc});
  const hexToRgb=h=>{h=h.replace('#',''); if(h.length===3)h=[...h].map(c=>c+c).join(''); const n=parseInt(h,16); return [(n>>16)&255,(n>>8)&255,n&255]};
  const rgbToCss=(rgb,a=1)=>`rgba(${rgb[0]|0},${rgb[1]|0},${rgb[2]|0},${a})`;
  const shade=(hex,k)=>{const c=hexToRgb(hex);return rgbToCss(c.map(v=>clamp(v*k,0,255)))};
  const reduced=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function makeGeo(freq=3){
    const V=[
      {x:-1,y: PHI,z:0},{x:1,y: PHI,z:0},{x:-1,y:-PHI,z:0},{x:1,y:-PHI,z:0},
      {x:0,y:-1,z: PHI},{x:0,y:1,z: PHI},{x:0,y:-1,z:-PHI},{x:0,y:1,z:-PHI},
      {x: PHI,y:0,z:-1},{x: PHI,y:0,z:1},{x:-PHI,y:0,z:-1},{x:-PHI,y:0,z:1}
    ].map(norm);
    const F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
    const verts=[],vmap=new Map(),faces=[];
    const key=p=>[p.x,p.y,p.z].map(n=>Math.round(n*1e7)).join(',');
    const addV=p=>{const k=key(p);if(vmap.has(k))return vmap.get(k);const id=verts.length;verts.push(p);vmap.set(k,id);return id};
    F.forEach(face=>{
      const a=V[face[0]],b=V[face[1]],c=V[face[2]],g=[];
      for(let i=0;i<=freq;i++){
        g[i]=[];
        for(let j=0;j<=freq-i;j++){
          const wa=(freq-i-j)/freq,wb=i/freq,wc=j/freq;
          g[i][j]=addV(mix3(a,b,c,wa,wb,wc));
        }
      }
      for(let i=0;i<freq;i++)for(let j=0;j<freq-i;j++){
        const A=g[i][j],B=g[i+1][j],C=g[i][j+1];faces.push([A,B,C]);
        if(j<freq-i-1){const D=g[i+1][j+1];faces.push([B,D,C]);}
      }
    });
    // 5/12-ish upper cap. Faces stay intact: no fake clipped timber ends.
    const cut=-0.045;
    const keptFaces=faces.filter(f=>f.every(i=>verts[i].y>=cut));
    const used=new Set(keptFaces.flat());
    let minY=Infinity,maxY=-Infinity;
    used.forEach(i=>{minY=Math.min(minY,verts[i].y);maxY=Math.max(maxY,verts[i].y)});
    const h=Math.max(.001,maxY-minY),sc=1.65/h;
    const out=verts.map(p=>({x:p.x*sc,y:(p.y-minY)*sc,z:p.z*sc}));
    const edgeLens=[];
    keptFaces.forEach(f=>[[0,1],[1,2],[2,0]].forEach(([i,j])=>edgeLens.push(len(sub(out[f[j]],out[f[i]])))));
    const fam=[];
    edgeLens.slice().sort((a,b)=>a-b).forEach(L=>{if(!fam.some(x=>Math.abs(x-L)<1e-4))fam.push(L)});
    fam.sort((a,b)=>a-b);
    return {verts:out,faces:keptFaces,families:fam};
  }
  const GEO=makeGeo(3);

  function familyFor(L){
    let bi=0,bd=Infinity;
    GEO.families.forEach((v,i)=>{const d=Math.abs(v-L);if(d<bd){bd=d;bi=i}});
    return bi;
  }

  function buildMembers(){
    const members=[]; let id=0;
    GEO.faces.forEach((f,fi)=>{
      const p=f.map(i=>GEO.verts[i]);
      let n=norm(cross(sub(p[1],p[0]),sub(p[2],p[0])));
      const c=mul(add(add(p[0],p[1]),p[2]),1/3);
      if(dot(n,c)<0)n=mul(n,-1);
      const avg=(len(sub(p[1],p[0]))+len(sub(p[2],p[1]))+len(sub(p[0],p[2])))/3;
      const band=clamp(.19*(avg/.55),.13,.22); // mitered triangular-frame band
      const inner=p.map(v=>lerp(v,c,band));
      [[0,1],[1,2],[2,0]].forEach(([a,b],side)=>{
        const L=len(sub(p[b],p[a]));
        const other=[0,1,2].find(k=>k!==a&&k!==b);
        const angA=angleDeg(sub(p[b],p[a]),sub(p[other],p[a]));
        const angB=angleDeg(sub(p[a],p[b]),sub(p[other],p[b]));
        members.push({id:id++,face:fi,side,family:familyFor(L),length:L,normal:n,centroid:c,a:p[a],b:p[b],
          cuts:{a:{miter:angA/2,bevel:0},b:{miter:angB/2,bevel:0}},
          quad:[p[a],p[b],inner[b],inner[a]]});
      });
    });
    const qty=Array(GEO.families.length).fill(0);members.forEach(m=>qty[m.family]++);
    return {members,qty};
  }
  const MODEL=buildMembers();
  const FAMILY_NAMES='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const REPRESENTATIVES=GEO.families.map((_,i)=>MODEL.members.find(m=>m.family===i)).filter(Boolean);
  const REP_IDS=new Set(REPRESENTATIVES.map(m=>m.id));

  function theme(){
    const dark=document.documentElement.dataset.theme==='dark';
    return dark?{
      bg:'#1d211b',wood:'#c7a06e',wood2:'#9e774e',woodSide:'#755738',outline:'#10130f',wire:'#9eaa75',muted:'#596050',orange:'#e57c33',olive:'#9eaa75',text:'#f4f1e8',screw:'#1c211a',grid:'rgba(158,170,117,.08)',ground:'rgba(0,0,0,.24)'
    }:{
      bg:'#eef1e9',wood:'#b98a56',wood2:'#d1a56c',woodSide:'#89613e',outline:'#493b2c',wire:'#66724c',muted:'#b9c0b0',orange:'#d96f2b',olive:'#66724c',text:'#1a1d18',screw:'#353a31',grid:'rgba(102,114,76,.09)',ground:'rgba(55,62,48,.16)'
    };
  }
  const FAMILY_COLORS=['#66724C','#D96F2B','#B58B59','#7D8E62','#A85D38','#8D765F','#B0A36B','#5E776F','#C07B42'];

  function rotatePoint(p,yaw,pitch){
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const x=p.x*cy+p.z*sy,z=-p.x*sy+p.z*cy,y=p.y;
    return {x,y:y*cp-z*sp,z:y*sp+z*cp};
  }
  function project(p,w,h,zoom){
    const cam=5.25,den=Math.max(2.25,cam-p.z),s=Math.min(w,h)*1.38*zoom/den;
    return {x:w*.51+p.x*s,y:h*.77-p.y*s,z:p.z,s};
  }
  function pointInPoly(x,y,poly){
    let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
      const hit=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-9)+xi);if(hit)inside=!inside;
    }return inside;
  }

  class DomeRenderer{
    constructor(shell,{role='hero',auto=true}={}){
      this.shell=shell;this.canvas=shell.querySelector('canvas');this.ctx=this.canvas.getContext('2d',{alpha:true});this.role=role;
      this.yaw=-.82;this.pitch=-.22;this.zoom=.96;this.auto=auto&&!reduced();this.paused=reduced();this.drag=false;this.pointer=null;this.resumeTimer=null;
      this.mode='structure';this.focusFamily=0;this.hoverMember=null;this.hit=[];this.last=performance.now();this.spin=0;this.sequenceAngle=0;this.explode=0;this.familyTimer=0;this.storyStage=0;this.ready=false;
      this.sequenceStage='assembled';this.sequenceFamilyColors=false;this.specimenProgress=0;this.cutSlot=-1;this.cutSlotProgress=0;
      this.initTime=performance.now();this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(shell);this.resize();this.bind();this.buildFamilyButtons();this.buildPhaseRail();this.animate=this.animate.bind(this);requestAnimationFrame(this.animate);
    }
    resize(){
      const r=this.shell.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,window.innerWidth<600?1.35:2);
      this.w=Math.max(1,r.width);this.h=Math.max(1,r.height);this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);this.canvas.style.width=this.w+'px';this.canvas.style.height=this.h+'px';this.ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    buildPhaseRail(){
      if(this.role!=='hero'||this.shell.querySelector('.v13-phase'))return;
      const rail=document.createElement('div');rail.className='v13-phase';rail.innerHTML='<span data-phase="assembled">ASSEMBLED</span><span data-phase="explode">EXPLODE</span><span data-phase="return">RETURN</span><span data-phase="cuts">CUTS</span>';this.shell.appendChild(rail);this.phaseRail=rail;
    }
    syncPhaseRail(){
      if(!this.phaseRail)return;let key=this.sequenceStage;if(['extract','inspect','reset'].includes(key))key='cuts';this.phaseRail.querySelectorAll('span').forEach(x=>x.classList.toggle('active',x.dataset.phase===key));
    }
    scheduleResume(){clearTimeout(this.resumeTimer);if(this.paused||reduced())return;this.resumeTimer=setTimeout(()=>{this.auto=true;this.shell.classList.add('is-auto')},2000)}
    bind(){
      const s=this.shell;
      s.addEventListener('pointerdown',e=>{if(e.target.closest('button,input,a'))return;s.setPointerCapture?.(e.pointerId);this.drag=true;this.auto=false;this.pointer={x:e.clientX,y:e.clientY};this.downPoint={x:e.clientX,y:e.clientY};this.shell.classList.remove('is-auto')});
      s.addEventListener('pointermove',e=>{
        if(this.drag&&this.pointer){const dx=e.clientX-this.pointer.x,dy=e.clientY-this.pointer.y;this.pointer={x:e.clientX,y:e.clientY};this.yaw+=dx*.008;this.pitch=clamp(this.pitch+dy*.0055,-.68,.34);return}
        const r=s.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;this.hoverAt(x,y);
      });
      const up=e=>{if(!this.drag)return;const d=this.downPoint?Math.hypot((e?.clientX||0)-this.downPoint.x,(e?.clientY||0)-this.downPoint.y):99;this.drag=false;this.pointer=null;this.downPoint=null;if(d<6&&e){const r=s.getBoundingClientRect();this.hoverAt(e.clientX-r.left,e.clientY-r.top);if(this.hoverMember)this.setFocusFamily(this.hoverMember.family,'member-pick')}this.scheduleResume()};s.addEventListener('pointerup',up);s.addEventListener('pointercancel',up);
      s.addEventListener('pointerleave',()=>{if(!this.drag){this.hoverMember=null;this.updateInspector(null)}});
      s.addEventListener('wheel',e=>{e.preventDefault();this.auto=false;this.zoom=clamp(this.zoom*(e.deltaY>0?.92:1.08),.68,1.72);this.scheduleResume()},{passive:false});
      let pinch=null;s.addEventListener('touchmove',e=>{if(e.touches.length===2){e.preventDefault();this.auto=false;const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinch)this.zoom=clamp(this.zoom*d/pinch,.68,1.72);pinch=d}},{passive:false});s.addEventListener('touchend',()=>{pinch=null;this.scheduleResume()},{passive:true});
      s.querySelectorAll('[data-v12-mode]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();this.setMode(b.dataset.v12Mode);this.auto=false;this.scheduleResume()}));
      s.querySelector('[data-v12-reset]')?.addEventListener('click',e=>{e.stopPropagation();this.yaw=-.82;this.pitch=-.22;this.zoom=.96;this.spin=0;this.sequenceAngle=0;this.auto=!this.paused&&!reduced();this.hoverMember=null;this.updateInspector(null)});
      s.querySelector('[data-v12-pause]')?.addEventListener('click',e=>{e.stopPropagation();this.paused=!this.paused;this.auto=!this.paused&&!reduced();e.currentTarget.classList.toggle('active',this.paused);e.currentTarget.textContent=this.paused?'▶':'Ⅱ';e.currentTarget.title=this.paused?'Resume motion':'Pause motion'});
      s.querySelector('[data-v12-fullscreen]')?.addEventListener('click',e=>{e.stopPropagation();if(!document.fullscreenElement)s.requestFullscreen?.();else document.exitFullscreen?.()});
      s.querySelector('[data-v12-copy]')?.addEventListener('click',async e=>{e.stopPropagation();const state=`mode=${this.mode}&family=${this.focusFamily}&yaw=${this.yaw.toFixed(2)}&pitch=${this.pitch.toFixed(2)}&zoom=${this.zoom.toFixed(2)}`;const url=location.href.split('#')[0]+'#dome3d?'+state;try{await navigator.clipboard.writeText(url);e.currentTarget.textContent='Copied ✓';setTimeout(()=>e.currentTarget.textContent='Copy this view',1600)}catch(_){location.hash='dome3d?'+state}});
    }
    buildFamilyButtons(){
      const host=this.shell.querySelector('[data-v12-families]');if(!host)return;host.innerHTML='';
      GEO.families.forEach((L,i)=>{const b=document.createElement('button');b.type='button';b.textContent=FAMILY_NAMES[i]||String(i+1);b.title=`Member family ${FAMILY_NAMES[i]}`;b.style.setProperty('--family',FAMILY_COLORS[i%FAMILY_COLORS.length]);b.addEventListener('click',e=>{e.stopPropagation();this.setFocusFamily(i,'family-button');this.auto=false;this.scheduleResume()});host.appendChild(b)});
    }
    setMode(m){this.mode=m;this.syncModeButtons();if(m==='families')this.familyTimer=0;this.updateHud()}
    setFocusFamily(i,source='ui'){
      const n=Math.max(1,GEO.families.length);this.focusFamily=((i%n)+n)%n;this.mode='families';this.familyTimer=0;this.syncModeButtons();this.updateHud();
      this.shell.dispatchEvent(new CustomEvent('domefamilychange',{detail:{family:this.focusFamily,source}}));
    }
    syncModeButtons(){this.shell.querySelectorAll('[data-v12-mode]').forEach(b=>b.classList.toggle('active',b.dataset.v12Mode===this.mode));this.shell.querySelectorAll('[data-v12-families] button').forEach((b,i)=>b.classList.toggle('active',i===this.focusFamily&&this.mode==='families'))}
    setStoryStage(n){this.storyStage=n;this.mode=['wire','structure','families','assembly','report'][n]||'structure';if(n===2)this.focusFamily=(this.focusFamily+1)%GEO.families.length;this.syncModeButtons();}
    hoverAt(x,y){
      let found=null;for(let i=this.hit.length-1;i>=0;i--){const h=this.hit[i];if(pointInPoly(x,y,h.poly)){found=h.member;break}}
      if(found!==this.hoverMember){this.hoverMember=found;if(found){this.focusFamily=found.family;this.updateInspector(found);this.updateHud()}else this.updateInspector(null)}
    }
    updateInspector(m){const el=this.shell.querySelector('[data-v12-inspector]');if(!el)return;if(!m){el.classList.remove('show');return}const L=(m.length/GEO.families[0]).toFixed(3);el.innerHTML=`<b>TYPE ${FAMILY_NAMES[m.family]}</b><span>${MODEL.qty[m.family]} members in family</span><span>Demo relative length ${L}×A</span><span>End A · miter ${m.cuts.a.miter.toFixed(1)}° · bevel ${m.cuts.a.bevel.toFixed(1)}°</span><span>End B · miter ${m.cuts.b.miter.toFixed(1)}° · bevel ${m.cuts.b.bevel.toFixed(1)}°</span><small>Temporary reference geometry. Native fabrication values will replace these demo cuts.</small>`;el.classList.add('show')}
    updateSequence(){
      if(this.role!=='hero'){
        this.specimenProgress=0;this.cutSlot=-1;this.sequenceFamilyColors=false;
        this.explode=(this.mode==='assembly'&&!this.paused&&!reduced())?((1-Math.cos(this.spin))/2):0;return;
      }
      if(this.paused||reduced()){this.explode=0;this.specimenProgress=0;this.cutSlot=-1;this.sequenceFamilyColors=false;this.sequenceStage='assembled';this.syncPhaseRail();return}
      const p=((this.sequenceAngle%TAU)+TAU)%TAU/TAU;
      this.explode=0;this.specimenProgress=0;this.cutSlot=-1;this.cutSlotProgress=0;this.sequenceFamilyColors=false;
      if(p<.25)this.sequenceStage='assembled';
      else if(p<.50){this.sequenceStage='explode';this.explode=smooth((p-.25)/.25);this.sequenceFamilyColors=this.explode>.005}
      else if(p<.75){this.sequenceStage='return';this.explode=1-smooth((p-.50)/.25);this.sequenceFamilyColors=this.explode>.005}
      else if(p<.82){this.sequenceStage='extract';this.specimenProgress=smooth((p-.75)/.07)}
      else if(p<.96){this.sequenceStage='inspect';this.specimenProgress=1;const total=Math.max(1,REPRESENTATIVES.length*2),q=clamp((p-.82)/.14,0,.999999)*total;this.cutSlot=Math.floor(q);this.cutSlotProgress=q-this.cutSlot}
      else{this.sequenceStage='reset';this.specimenProgress=1-smooth((p-.96)/.04)}
      this.syncPhaseRail();const cta=this.shell.querySelector('[data-v13-report-cta]');if(cta)cta.classList.toggle('show',(this.sequenceStage==='inspect'&&this.cutSlot>=Math.max(0,REPRESENTATIVES.length*2-2))||this.sequenceStage==='reset');
    }
    updateHud(){
      const fam=FAMILY_NAMES[this.focusFamily]||'A',L=GEO.families[this.focusFamily]||GEO.families[0];let seq=null;
      if(this.role==='hero'){
        if(this.sequenceStage==='assembled')seq=['ASSEMBLED STRUCTURE',`${GEO.faces.length} frame cells`,`${GEO.families.length} member families`];
        if(this.sequenceStage==='explode')seq=['FAMILY EXPLODE',`Explode ${Math.round(this.explode*100)}%`,'families color-coded'];
        if(this.sequenceStage==='return')seq=['RETURN TO FORM',`Explode ${Math.round(this.explode*100)}%`,'colors clear at zero'];
        if(this.sequenceStage==='extract')seq=['TYPE EXTRACTION','one member per family','arranging inspection rack'];
        if(this.sequenceStage==='inspect'){const i=Math.floor(Math.max(0,this.cutSlot)/2),end=this.cutSlot%2===0?'A':'B';seq=[`CUT INSPECTION · TYPE ${FAMILY_NAMES[i]||'A'}`,`End ${end}`,'miter + bevel']}
        if(this.sequenceStage==='reset')seq=['RESETTING SEQUENCE','members return to structure','cycle repeats automatically'];
      }
      const map={structure:['TRIANGULAR TIMBER FRAME',`${GEO.faces.length} frame cells`,`${GEO.families.length} member families`],families:[`TYPE ${fam}`,`${MODEL.qty[this.focusFamily]} members`,`${(L/GEO.families[0]).toFixed(3)}×A relative length`],assembly:['ASSEMBLY MOTION',`Explode ${Math.round(this.explode*100)}%`,'radial / ping-pong'],wire:['REFERENCE WIREFRAME',`${GEO.faces.length} triangular cells`,'centerline only'],report:['FABRICATION HANDOFF','Interactive Web report','browser · tablet · phone']};
      const v=(this.auto&&seq&&this.mode==='structure')?seq:(map[this.mode]||map.structure);this.shell.querySelectorAll('[data-v12-hud-main]').forEach(e=>e.textContent=v[0]);this.shell.querySelectorAll('[data-v12-hud-a]').forEach(e=>e.textContent=v[1]);this.shell.querySelectorAll('[data-v12-hud-b]').forEach(e=>e.textContent=v[2]);this.syncModeButtons();
    }
    memberColor(m,pal){
      if(this.mode==='wire')return pal.wire;
      if(this.mode==='families'||this.sequenceFamilyColors)return FAMILY_COLORS[m.family%FAMILY_COLORS.length];
      if(this.hoverMember)return m.family===this.hoverMember.family?pal.orange:pal.wood;
      return pal.wood;
    }
    drawWire(ctx,pal,clip){
      if(clip){ctx.save();ctx.beginPath();ctx.rect(...clip);ctx.clip()}
      ctx.globalAlpha=.82;ctx.lineWidth=1.2;
      const seen=new Set();
      GEO.faces.forEach(f=>[[0,1],[1,2],[2,0]].forEach(([a,b])=>{let i=f[a],j=f[b],k=i<j?i+':'+j:j+':'+i;if(seen.has(k))return;seen.add(k);const A=project(rotatePoint(GEO.verts[i],this.yaw,this.pitch),this.w,this.h,this.zoom),B=project(rotatePoint(GEO.verts[j],this.yaw,this.pitch),this.w,this.h,this.zoom);ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.strokeStyle=pal.wire;ctx.stroke()}));ctx.globalAlpha=1;if(clip)ctx.restore();
    }
    drawMembers(ctx,pal,{clip=null,forceMode=null}={}){
      const prevMode=this.mode;if(forceMode)this.mode=forceMode;if(clip){ctx.save();ctx.beginPath();ctx.rect(...clip);ctx.clip()}
      this.hit=[];const shapes=[];const light=norm({x:-.35,y:.75,z:.58});
      const amp=this.role==='hero'?.48:(this.mode==='assembly'?.48:.16);
      MODEL.members.forEach(m=>{
        const off=mul(norm(m.centroid),this.explode*amp);
        const thick=.022;
        const base=m.quad.map(p=>add(p,off));
        const top=base.map(p=>add(p,mul(m.normal,thick)));
        const verts=[...base,...top];
        const faces=[
          {ix:[4,5,6,7],n:m.normal,kind:'top'},
          {ix:[0,1,5,4],n:norm(cross(sub(base[1],base[0]),m.normal)),kind:'side'},
          {ix:[1,2,6,5],n:norm(cross(sub(base[2],base[1]),m.normal)),kind:'side'},
          {ix:[2,3,7,6],n:norm(cross(sub(base[3],base[2]),m.normal)),kind:'side'},
          {ix:[3,0,4,7],n:norm(cross(sub(base[0],base[3]),m.normal)),kind:'side'}
        ];
        const tr=verts.map(p=>rotatePoint(p,this.yaw,this.pitch));const pr=tr.map(p=>project(p,this.w,this.h,this.zoom));
        faces.forEach(f=>{const z=f.ix.reduce((s,i)=>s+tr[i].z,0)/f.ix.length;shapes.push({m,f,z,poly:f.ix.map(i=>pr[i])})});
        this.hit.push({member:m,poly:[pr[4],pr[5],pr[6],pr[7]],z:(tr[4].z+tr[5].z+tr[6].z+tr[7].z)/4});
      });
      shapes.sort((a,b)=>a.z-b.z);this.hit.sort((a,b)=>a.z-b.z);
      shapes.forEach(s=>{
        const m=s.m,faceN=rotatePoint(s.f.n,this.yaw,this.pitch);let k=.72+.30*Math.max(0,dot(norm(faceN),light));
        let c=this.memberColor(m,pal);if(s.f.kind==='side')k*=.72;
        if(this.mode==='families'&&m.family!==this.focusFamily)k*=.82;
        ctx.beginPath();s.poly.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=shade(c,k);let alpha=(this.mode==='families'&&m.family!==this.focusFamily)?.52:1;if(this.specimenProgress>.01&&REP_IDS.has(m.id))alpha*=1-.88*this.specimenProgress;ctx.globalAlpha=alpha;ctx.fill();
        if(s.f.kind==='top'){ctx.strokeStyle=(this.mode==='families'&&m.family===this.focusFamily)||this.hoverMember?.family===m.family?pal.orange:pal.outline;ctx.lineWidth=(this.mode==='families'&&m.family===this.focusFamily)?1.8:.55;ctx.stroke()}
      });ctx.globalAlpha=1;
      if(clip)ctx.restore();if(forceMode)this.mode=prevMode;
    }
    drawFamilyLabels(ctx,pal){
      if(this.role!=='hero'||this.explode<.72||this.specimenProgress>.01)return;
      ctx.save();REPRESENTATIVES.forEach((m,i)=>{const mid=mul(add(add(add(m.quad[0],m.quad[1]),m.quad[2]),m.quad[3]),.25),off=mul(norm(m.centroid),this.explode*.48),q=project(rotatePoint(add(add(mid,off),mul(m.normal,.04)),this.yaw,this.pitch),this.w,this.h,this.zoom),txt=`${FAMILY_NAMES[m.family]} · ${MODEL.qty[m.family]}`;ctx.font='800 8px ui-monospace, SFMono-Regular, Menlo, monospace';const tw=ctx.measureText(txt).width+14,x=clamp(q.x-tw/2,8,this.w-tw-8),y=clamp(q.y-17,8,this.h-26);ctx.fillStyle=document.documentElement.dataset.theme==='dark'?'rgba(20,23,18,.90)':'rgba(255,255,255,.92)';ctx.strokeStyle=FAMILY_COLORS[m.family%FAMILY_COLORS.length];ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y,tw,20,999);ctx.fill();ctx.stroke();ctx.fillStyle=pal.text;ctx.fillText(txt,x+7,y+13)});ctx.restore();
    }
    repSource(m){const mid=mul(add(add(add(m.quad[0],m.quad[1]),m.quad[2]),m.quad[3]),.25);return project(rotatePoint(add(mid,mul(m.normal,.025)),this.yaw,this.pitch),this.w,this.h,this.zoom)}
    drawArrow(ctx,x1,y1,x2,y2,color){ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.35;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();const a=Math.atan2(y2-y1,x2-x1),z=6;ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-Math.cos(a-.55)*z,y2-Math.sin(a-.55)*z);ctx.lineTo(x2-Math.cos(a+.55)*z,y2-Math.sin(a+.55)*z);ctx.closePath();ctx.fill();ctx.restore()}
    drawSpecimens(ctx,pal){
      const p=this.specimenProgress;if(p<=.001||!REPRESENTATIVES.length)return;
      const mobile=this.w<560,n=REPRESENTATIVES.length,gap=mobile?38:46;
      ctx.save();ctx.globalAlpha=clamp(p*1.15,0,1);
      const panelW=mobile?Math.min(this.w*.72,300):Math.min(350,this.w*.40),panelH=58+gap*n+76;
      const panelX=clamp(this.w-panelW-(mobile?8:18),8,this.w-panelW-8),panelY=clamp(this.h*.32,54,this.h-panelH-18);
      const rackX=panelX+panelW*.68,firstY=panelY+58;
      ctx.fillStyle=document.documentElement.dataset.theme==='dark'?'rgba(18,21,17,.86)':'rgba(252,251,247,.93)';ctx.strokeStyle=document.documentElement.dataset.theme==='dark'?'rgba(158,170,117,.22)':'rgba(70,81,58,.20)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(panelX,panelY,panelW,panelH,10);ctx.fill();ctx.stroke();
      ctx.fillStyle=pal.text;ctx.font='700 9px ui-monospace, SFMono-Regular, Menlo, monospace';ctx.fillText('MEMBER FAMILY INSPECTION',panelX+12,panelY+17);ctx.font='500 7px ui-monospace, SFMono-Regular, Menlo, monospace';ctx.fillStyle=document.documentElement.dataset.theme==='dark'?'#aab39f':'#697064';ctx.fillText('TEMPORARY REFERENCE CUT VALUES',panelX+12,panelY+30);
      REPRESENTATIVES.forEach((m,i)=>{
        const src=this.repSource(m),ty=firstY+i*gap,tx=rackX,move=smooth(p),x=src.x+(tx-src.x)*move,y=src.y+(ty-src.y)*move,rel=m.length/GEO.families[0],barW=(mobile?70:104)*(.88+.14*rel),barH=mobile?9:11,col=FAMILY_COLORS[m.family%FAMILY_COLORS.length];
        ctx.save();ctx.translate(x,y);ctx.fillStyle=col;ctx.strokeStyle=shade(col,.62);ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-barW/2+7,-barH/2);ctx.lineTo(barW/2-7,-barH/2);ctx.lineTo(barW/2,barH/2);ctx.lineTo(-barW/2,barH/2);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
        ctx.fillStyle=pal.text;ctx.font='800 8px ui-monospace, SFMono-Regular, Menlo, monospace';ctx.fillText(`TYPE ${FAMILY_NAMES[m.family]} · QTY ${MODEL.qty[m.family]}`,rackX-barW/2,ty-9);
      });
      if(this.sequenceStage==='inspect'&&this.cutSlot>=0){
        const fi=Math.floor(this.cutSlot/2),end=this.cutSlot%2,rep=REPRESENTATIVES[fi];
        if(rep){
          const y=firstY+fi*gap,rel=rep.length/GEO.families[0],barW=(mobile?70:104)*(.88+.14*rel),endX=rackX+(end?barW/2:-barW/2),boxX=panelX+12,boxY=panelY+panelH-64,boxW=panelW-24,boxH=52,fade=smooth(Math.min(1,this.cutSlotProgress*3));
          this.drawArrow(ctx,endX,y,boxX+boxW*.72,boxY,pal.orange);ctx.globalAlpha*=fade;
          ctx.fillStyle=document.documentElement.dataset.theme==='dark'?'rgba(20,23,18,.97)':'rgba(255,255,255,.98)';ctx.strokeStyle=pal.orange;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(boxX,boxY,boxW,boxH,7);ctx.fill();ctx.stroke();
          ctx.fillStyle=pal.orange;ctx.font='800 8px ui-monospace, SFMono-Regular, Menlo, monospace';ctx.fillText(`TYPE ${FAMILY_NAMES[rep.family]} · END ${end?'B':'A'}`,boxX+9,boxY+13);
          const cut=end?rep.cuts.b:rep.cuts.a;ctx.fillStyle=pal.text;ctx.font='700 9px ui-monospace, SFMono-Regular, Menlo, monospace';ctx.fillText(`MITER  ${cut.miter.toFixed(1)}°`,boxX+9,boxY+29);ctx.fillText(`BEVEL  ${cut.bevel.toFixed(1)}°`,boxX+9,boxY+42);
          ctx.font='500 6.5px ui-monospace, SFMono-Regular, Menlo, monospace';ctx.fillStyle=document.documentElement.dataset.theme==='dark'?'#aab39f':'#747b70';ctx.textAlign='right';ctx.fillText('DEMO FRAME · NATIVE VALUES LATER',boxX+boxW-8,boxY+42);ctx.textAlign='left';
        }
      }
      ctx.restore();
    }
    drawGround(ctx,pal){ctx.save();ctx.beginPath();ctx.ellipse(this.w*.51,this.h*.79,Math.min(this.w,this.h)*.30*this.zoom,Math.min(this.w,this.h)*.045*this.zoom,0,0,TAU);ctx.fillStyle=pal.ground;ctx.filter='blur(8px)';ctx.fill();ctx.filter='none';ctx.restore()}
    draw(){
      const ctx=this.ctx,pal=theme();ctx.clearRect(0,0,this.w,this.h);this.drawGround(ctx,pal);
      if(this.role==='compare')return;
      if(this.mode==='wire')this.drawWire(ctx,pal);else this.drawMembers(ctx,pal);if(this.role==='hero'){this.drawFamilyLabels(ctx,pal);this.drawSpecimens(ctx,pal);}
      this.updateHud();
    }
    animate(t){
      const dt=Math.min(.05,(t-this.last)/1000);this.last=t;
      if(!this.ready){const k=clamp((t-this.initTime)/1100,0,1),e=1-Math.pow(1-k,3);this.yaw=-1.12+(.30*e);this.pitch=-.10+(-.12*e);this.zoom=.86+.10*e;if(k>=1){this.ready=true;this.shell.classList.add('is-ready')}}
      if(this.auto&&!this.drag&&!this.paused&&!reduced()){const speed=.25;this.yaw+=speed*dt;this.spin+=speed*dt;if(this.role==='hero')this.sequenceAngle+=speed*dt;if(this.mode==='families'&&this.role!=='hero'){this.familyTimer+=dt;const delay=this.role==='handoff'?4.4:2.8;if(this.familyTimer>delay){this.familyTimer=0;this.setFocusFamily(this.focusFamily+1,'auto')}}}
      this.updateSequence();this.draw();requestAnimationFrame(this.animate)
    }
  }

  class CompareRenderer extends DomeRenderer{
    constructor(shell){super(shell,{role:'compare',auto:!reduced()});this.split=.5;const input=shell.querySelector('input[type=range]');if(input)input.addEventListener('input',()=>this.split=+input.value/100)}
    bind(){super.bind();}
    draw(){const ctx=this.ctx,pal=theme();ctx.clearRect(0,0,this.w,this.h);this.drawGround(ctx,pal);const x=this.w*this.split;this.drawWire(ctx,pal,[0,0,x,this.h]);this.drawMembers(ctx,pal,{clip:[x,0,this.w-x,this.h],forceMode:'structure'});ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,this.h);ctx.strokeStyle=pal.orange;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=pal.orange;ctx.beginPath();ctx.arc(x,this.h*.5,11,0,TAU);ctx.fill();}
  }

  function bootHero(){document.querySelectorAll('[data-v12dome]').forEach(el=>{if(!el._v12)el._v12=new DomeRenderer(el,{role:el.dataset.role||'hero'})})}
  function bootCompare(){document.querySelectorAll('[data-v12compare]').forEach(el=>{if(!el._v12)el._v12=new CompareRenderer(el)})}
  function bootStory(){
    document.querySelectorAll('[data-v12-story]').forEach(section=>{
      if(section.dataset.bound)return;section.dataset.bound='1';const shell=section.querySelector('[data-v12-story-view]');if(!shell)return;const r=shell._v12||(shell._v12=new DomeRenderer(shell,{role:'story'}));const steps=[...section.querySelectorAll('[data-v12-step]')];
      const report=section.querySelector('.v12-story-report');
      const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const i=steps.indexOf(entry.target);steps.forEach((s,k)=>s.classList.toggle('active',k===i));r.setStoryStage(i);if(report)report.classList.toggle('show',i===4)}),{rootMargin:'-36% 0px -46% 0px',threshold:.01});steps.forEach(s=>io.observe(s));
    })
  }
  function bootHandoff(){
    document.querySelectorAll('[data-v14-handoff]').forEach(section=>{
      if(section.dataset.bound)return;section.dataset.bound='1';
      const shell=section.querySelector('[data-v14-model]');if(!shell)return;
      const r=shell._v12||(shell._v12=new DomeRenderer(shell,{role:'handoff',auto:!reduced()}));
      r.mode='families';r.pitch=-.20;r.zoom=.92;r.syncModeButtons();
      const tabs=section.querySelector('[data-v14-tabs]');
      if(tabs){tabs.innerHTML='';GEO.families.forEach((L,i)=>{const b=document.createElement('button');b.type='button';b.dataset.family=i;b.style.setProperty('--family',FAMILY_COLORS[i%FAMILY_COLORS.length]);b.innerHTML=`<i></i><span>TYPE ${FAMILY_NAMES[i]}</span>`;b.addEventListener('click',()=>{r.setFocusFamily(i,'report-tab');r.auto=false;r.scheduleResume()});tabs.appendChild(b)})}
      const set=(sel,val)=>section.querySelectorAll(sel).forEach(el=>el.textContent=val);
      const update=i=>{
        i=clamp(i,0,GEO.families.length-1);const rep=REPRESENTATIVES[i]||REPRESENTATIVES[0],name=FAMILY_NAMES[i]||'A',col=FAMILY_COLORS[i%FAMILY_COLORS.length],rel=(GEO.families[i]/GEO.families[0]).toFixed(3);
        section.style.setProperty('--v14-family',col);set('[data-v14-type]',`TYPE ${name}`);set('[data-v14-qty]',MODEL.qty[i]);set('[data-v14-length]',`${rel}×A`);
        if(rep){set('[data-v14-a-miter]',`${rep.cuts.a.miter.toFixed(1)}°`);set('[data-v14-a-bevel]',`${rep.cuts.a.bevel.toFixed(1)}°`);set('[data-v14-b-miter]',`${rep.cuts.b.miter.toFixed(1)}°`);set('[data-v14-b-bevel]',`${rep.cuts.b.bevel.toFixed(1)}°`)}
        section.querySelectorAll('[data-v14-tabs] button').forEach((b,k)=>b.classList.toggle('active',k===i));
        section.querySelectorAll('[data-v14-stage="family"]').forEach(el=>el.classList.add('active'));
        const bar=section.querySelector('[data-v14-member-bar]');if(bar)bar.setAttribute('fill',col);
      };
      shell.addEventListener('domefamilychange',e=>update(e.detail.family));
      update(r.focusFamily);
    })
  }
  function loadHash(){
    if(!location.hash.startsWith('#dome3d?'))return;const q=new URLSearchParams(location.hash.slice(8));const shell=document.querySelector('[data-v12dome]');if(!shell?._v12)return;const r=shell._v12;r.mode=q.get('mode')||r.mode;r.focusFamily=clamp(parseInt(q.get('family')||'0',10),0,GEO.families.length-1);r.yaw=parseFloat(q.get('yaw')||r.yaw);r.pitch=parseFloat(q.get('pitch')||r.pitch);r.zoom=parseFloat(q.get('zoom')||r.zoom);r.syncModeButtons();
  }
  function init(){bootHero();bootCompare();bootStory();bootHandoff();setTimeout(loadHash,50)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
