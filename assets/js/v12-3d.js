/* Dome of Drums V12 — browser-native timber-frame 3D prototype.
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
        members.push({id:id++,face:fi,side,family:familyFor(L),length:L,normal:n,centroid:c,
          quad:[p[a],p[b],inner[b],inner[a]]});
      });
    });
    const qty=Array(GEO.families.length).fill(0);members.forEach(m=>qty[m.family]++);
    return {members,qty};
  }
  const MODEL=buildMembers();
  const FAMILY_NAMES='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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
      this.mode='structure';this.focusFamily=0;this.hoverMember=null;this.hit=[];this.last=performance.now();this.spin=0;this.explode=0;this.familyTimer=0;this.storyStage=0;this.ready=false;
      this.initTime=performance.now();this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(shell);this.resize();this.bind();this.buildFamilyButtons();this.animate=this.animate.bind(this);requestAnimationFrame(this.animate);
    }
    resize(){
      const r=this.shell.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,window.innerWidth<600?1.35:2);
      this.w=Math.max(1,r.width);this.h=Math.max(1,r.height);this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);this.canvas.style.width=this.w+'px';this.canvas.style.height=this.h+'px';this.ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    scheduleResume(){clearTimeout(this.resumeTimer);if(this.paused||reduced())return;this.resumeTimer=setTimeout(()=>{this.auto=true;this.shell.classList.add('is-auto')},1800)}
    bind(){
      const s=this.shell;
      s.addEventListener('pointerdown',e=>{if(e.target.closest('button,input,a'))return;s.setPointerCapture?.(e.pointerId);this.drag=true;this.auto=false;this.pointer={x:e.clientX,y:e.clientY};this.shell.classList.remove('is-auto')});
      s.addEventListener('pointermove',e=>{
        if(this.drag&&this.pointer){const dx=e.clientX-this.pointer.x,dy=e.clientY-this.pointer.y;this.pointer={x:e.clientX,y:e.clientY};this.yaw+=dx*.008;this.pitch=clamp(this.pitch+dy*.0055,-.68,.34);this.spin=this.yaw;return}
        const r=s.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;this.hoverAt(x,y);
      });
      const up=()=>{if(!this.drag)return;this.drag=false;this.pointer=null;this.scheduleResume()};s.addEventListener('pointerup',up);s.addEventListener('pointercancel',up);
      s.addEventListener('pointerleave',()=>{if(!this.drag){this.hoverMember=null;this.updateInspector(null)}});
      s.addEventListener('wheel',e=>{e.preventDefault();this.auto=false;this.zoom=clamp(this.zoom*(e.deltaY>0?.92:1.08),.68,1.72);this.scheduleResume()},{passive:false});
      let pinch=null;s.addEventListener('touchmove',e=>{if(e.touches.length===2){e.preventDefault();this.auto=false;const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinch)this.zoom=clamp(this.zoom*d/pinch,.68,1.72);pinch=d}},{passive:false});s.addEventListener('touchend',()=>{pinch=null;this.scheduleResume()},{passive:true});
      s.querySelectorAll('[data-v12-mode]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();this.setMode(b.dataset.v12Mode);this.auto=false;this.scheduleResume()}));
      s.querySelector('[data-v12-reset]')?.addEventListener('click',e=>{e.stopPropagation();this.yaw=-.82;this.pitch=-.22;this.zoom=.96;this.spin=this.yaw;this.auto=!this.paused&&!reduced();this.hoverMember=null;this.updateInspector(null)});
      s.querySelector('[data-v12-pause]')?.addEventListener('click',e=>{e.stopPropagation();this.paused=!this.paused;this.auto=!this.paused&&!reduced();e.currentTarget.classList.toggle('active',this.paused);e.currentTarget.textContent=this.paused?'▶':'Ⅱ';e.currentTarget.title=this.paused?'Resume motion':'Pause motion'});
      s.querySelector('[data-v12-fullscreen]')?.addEventListener('click',e=>{e.stopPropagation();if(!document.fullscreenElement)s.requestFullscreen?.();else document.exitFullscreen?.()});
      s.querySelector('[data-v12-copy]')?.addEventListener('click',async e=>{e.stopPropagation();const state=`mode=${this.mode}&family=${this.focusFamily}&yaw=${this.yaw.toFixed(2)}&pitch=${this.pitch.toFixed(2)}&zoom=${this.zoom.toFixed(2)}`;const url=location.href.split('#')[0]+'#dome3d?'+state;try{await navigator.clipboard.writeText(url);e.currentTarget.textContent='Copied ✓';setTimeout(()=>e.currentTarget.textContent='Copy this view',1600)}catch(_){location.hash='dome3d?'+state}});
    }
    buildFamilyButtons(){
      const host=this.shell.querySelector('[data-v12-families]');if(!host)return;host.innerHTML='';
      GEO.families.forEach((L,i)=>{const b=document.createElement('button');b.type='button';b.textContent=FAMILY_NAMES[i]||String(i+1);b.title=`Member family ${FAMILY_NAMES[i]}`;b.style.setProperty('--family',FAMILY_COLORS[i%FAMILY_COLORS.length]);b.addEventListener('click',e=>{e.stopPropagation();this.focusFamily=i;this.mode='families';this.syncModeButtons();this.auto=false;this.scheduleResume();this.updateHud()});host.appendChild(b)});
    }
    setMode(m){this.mode=m;this.syncModeButtons();if(m==='families')this.familyTimer=0;this.updateHud()}
    syncModeButtons(){this.shell.querySelectorAll('[data-v12-mode]').forEach(b=>b.classList.toggle('active',b.dataset.v12Mode===this.mode));this.shell.querySelectorAll('[data-v12-families] button').forEach((b,i)=>b.classList.toggle('active',i===this.focusFamily&&this.mode==='families'))}
    setStoryStage(n){this.storyStage=n;this.mode=['wire','structure','families','assembly','report'][n]||'structure';if(n===2)this.focusFamily=(this.focusFamily+1)%GEO.families.length;this.syncModeButtons();}
    hoverAt(x,y){
      let found=null;for(let i=this.hit.length-1;i>=0;i--){const h=this.hit[i];if(pointInPoly(x,y,h.poly)){found=h.member;break}}
      if(found!==this.hoverMember){this.hoverMember=found;if(found){this.focusFamily=found.family;this.updateInspector(found);this.updateHud()}else this.updateInspector(null)}
    }
    updateInspector(m){const el=this.shell.querySelector('[data-v12-inspector]');if(!el)return;if(!m){el.classList.remove('show');return}const L=(m.length/GEO.families[0]).toFixed(3);el.innerHTML=`<b>TYPE ${FAMILY_NAMES[m.family]}</b><span>${MODEL.qty[m.family]} members in family</span><span>Demo relative length ${L}×A</span><small>Hovering one member highlights its whole family.</small>`;el.classList.add('show')}
    updateHud(){
      const fam=FAMILY_NAMES[this.focusFamily]||'A';const L=GEO.families[this.focusFamily]||GEO.families[0];
      const map={structure:['TRIANGULAR TIMBER FRAME',`${GEO.faces.length} frame cells`,`${GEO.families.length} member families`],families:[`TYPE ${fam}`,`${MODEL.qty[this.focusFamily]} members`,`${(L/GEO.families[0]).toFixed(3)}×A relative length`],assembly:['ASSEMBLY MOTION',`Explode ${Math.round(this.explode*100)}%`,'radial / ping-pong'],wire:['REFERENCE WIREFRAME',`${GEO.faces.length} triangular cells`,'centerline only'],report:['FABRICATION HANDOFF','Interactive Web report','browser · tablet · phone']};
      const v=map[this.mode]||map.structure;this.shell.querySelectorAll('[data-v12-hud-main]').forEach(e=>e.textContent=v[0]);this.shell.querySelectorAll('[data-v12-hud-a]').forEach(e=>e.textContent=v[1]);this.shell.querySelectorAll('[data-v12-hud-b]').forEach(e=>e.textContent=v[2]);
      this.syncModeButtons();
    }
    memberColor(m,pal){
      if(this.mode==='wire')return pal.wire;
      if(this.mode==='families'){
        const base=FAMILY_COLORS[m.family%FAMILY_COLORS.length];return m.family===this.focusFamily?pal.orange:base;
      }
      if(this.hoverMember){return m.family===this.hoverMember.family?pal.orange:pal.wood;}
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
      const phase=(1-Math.cos(this.spin))/2; // 0 -> 1 at half turn -> 0 at full turn
      const amp=this.mode==='assembly'?.28:.16;this.explode=(this.paused||reduced())?0:phase;
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
        ctx.beginPath();s.poly.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=shade(c,k);ctx.globalAlpha=(this.mode==='families'&&m.family!==this.focusFamily)?.52:1;ctx.fill();
        if(s.f.kind==='top'){ctx.strokeStyle=(this.mode==='families'&&m.family===this.focusFamily)||this.hoverMember?.family===m.family?pal.orange:pal.outline;ctx.lineWidth=(this.mode==='families'&&m.family===this.focusFamily)?1.8:.55;ctx.stroke()}
      });ctx.globalAlpha=1;
      // Small screw markers emphasize that corners are real joints, not centerline pipes.
      if(this.mode!=='wire'&&this.zoom>.76){
        GEO.faces.forEach((f,fi)=>{const p=f.map(i=>GEO.verts[i]),c=mul(add(add(p[0],p[1]),p[2]),1/3);p.forEach(v=>{const q=lerp(v,c,.10),m=MODEL.members[fi*3],off=mul(norm(m.centroid),this.explode*amp),r=project(rotatePoint(add(add(q,off),mul(m.normal,.025)),this.yaw,this.pitch),this.w,this.h,this.zoom);ctx.beginPath();ctx.arc(r.x,r.y,Math.max(1.0,1.4*r.s/90),0,TAU);ctx.fillStyle=pal.screw;ctx.globalAlpha=.72;ctx.fill()})});ctx.globalAlpha=1;
      }
      if(clip)ctx.restore();if(forceMode)this.mode=prevMode;
    }
    drawGround(ctx,pal){ctx.save();ctx.beginPath();ctx.ellipse(this.w*.51,this.h*.79,Math.min(this.w,this.h)*.30*this.zoom,Math.min(this.w,this.h)*.045*this.zoom,0,0,TAU);ctx.fillStyle=pal.ground;ctx.filter='blur(8px)';ctx.fill();ctx.filter='none';ctx.restore()}
    draw(){
      const ctx=this.ctx,pal=theme();ctx.clearRect(0,0,this.w,this.h);this.drawGround(ctx,pal);
      if(this.role==='compare')return;
      if(this.mode==='wire')this.drawWire(ctx,pal);else this.drawMembers(ctx,pal);
      this.updateHud();
    }
    animate(t){
      const dt=Math.min(.05,(t-this.last)/1000);this.last=t;
      if(!this.ready){const k=clamp((t-this.initTime)/1100,0,1),e=1-Math.pow(1-k,3);this.yaw=-1.12+(.30*e);this.pitch=-.10+(-.12*e);this.zoom=.86+.10*e;if(k>=1){this.ready=true;this.shell.classList.add('is-ready')}}
      if(this.auto&&!this.drag&&!this.paused&&!reduced()){const speed=.34;this.yaw+=speed*dt;this.spin+=speed*dt;if(this.mode==='families'){this.familyTimer+=dt;if(this.familyTimer>2.8){this.familyTimer=0;this.focusFamily=(this.focusFamily+1)%GEO.families.length}}}
      this.draw();requestAnimationFrame(this.animate)
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
  function loadHash(){
    if(!location.hash.startsWith('#dome3d?'))return;const q=new URLSearchParams(location.hash.slice(8));const shell=document.querySelector('[data-v12dome]');if(!shell?._v12)return;const r=shell._v12;r.mode=q.get('mode')||r.mode;r.focusFamily=clamp(parseInt(q.get('family')||'0',10),0,GEO.families.length-1);r.yaw=parseFloat(q.get('yaw')||r.yaw);r.pitch=parseFloat(q.get('pitch')||r.pitch);r.zoom=parseFloat(q.get('zoom')||r.zoom);r.syncModeButtons();
  }
  function init(){bootHero();bootCompare();bootStory();setTimeout(loadHash,50)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
