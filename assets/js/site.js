(function(){
  const root=document.documentElement;

  // Theme
  try{const t=localStorage.getItem('dod-theme');if(t)root.dataset.theme=t}catch(e){}
  function bindTheme(ctx=document){
    ctx.querySelectorAll('.theme-toggle:not([data-bound-theme])').forEach(b=>{
      b.dataset.boundTheme='1';
      b.addEventListener('click',()=>{
        const t=root.dataset.theme==='light'?'dark':'light';
        root.dataset.theme=t;
        try{localStorage.setItem('dod-theme',t)}catch(e){}
      });
    });
  }

  // Language
  let lang='en';
  try{lang=localStorage.getItem('dod-lang')||'en'}catch(e){}
  function applyLang(l){
    root.lang=l;
    document.body.classList.toggle('rtl',l==='ar');
    document.querySelectorAll('[data-en]').forEach(el=>{
      const v=el.dataset[l];
      if(v!==undefined)el.innerHTML=v;
    });
    document.querySelectorAll('.lang-toggle').forEach(b=>b.textContent=l==='ar'?'EN':'AR');
    try{localStorage.setItem('dod-lang',l)}catch(e){}
    // Refresh active lightbox text if open.
    if(lightboxState.card) renderLightbox(lightboxState.card);
  }
  function bindLang(ctx=document){
    ctx.querySelectorAll('.lang-toggle:not([data-bound-lang])').forEach(b=>{
      b.dataset.boundLang='1';
      b.addEventListener('click',()=>applyLang(root.lang==='ar'?'en':'ar'));
    });
  }

  // Responsive navigation injected into every header.
  function initMobileNav(ctx=document){
    ctx.querySelectorAll('.header .wrap').forEach(wrap=>{
      if(wrap.querySelector('.mobile-nav-toggle'))return;
      const nav=wrap.querySelector('.nav');
      if(!nav)return;
      const btn=document.createElement('button');
      btn.className='mobile-nav-toggle';
      btn.type='button';
      btn.setAttribute('aria-label','Menu');
      btn.setAttribute('aria-expanded','false');
      btn.innerHTML='☰';
      btn.addEventListener('click',()=>{
        const open=nav.classList.toggle('open');
        btn.setAttribute('aria-expanded',open?'true':'false');
        btn.innerHTML=open?'×':'☰';
      });
      nav.addEventListener('click',e=>{
        if(e.target.closest('a') && window.matchMedia('(max-width:900px)').matches){
          nav.classList.remove('open');btn.setAttribute('aria-expanded','false');btn.innerHTML='☰';
        }
      });
      wrap.insertBefore(btn,nav);
    });
  }

  function currentLang(){return root.lang==='ar'?'ar':'en'}

  // Hero slideshow with the triangle transition already established in V8.
  function initHero(ctx=document){
    ctx.querySelectorAll('[data-hero-slider]').forEach(slider=>{
      if(slider.dataset.heroInit==='1')return;
      slider.dataset.heroInit='1';
      const slides=[...slider.querySelectorAll('.v7-slide')];
      const dots=[...slider.querySelectorAll('[data-slide-to]')];
      if(!slides.length)return;
      const title=slider.querySelector('.v7-hero-caption-title');
      const sub=slider.querySelector('.v7-hero-caption-sub');
      let i=0,timer=null,busy=false;
      const intervalMs=3500,transitionMs=980;
      const holdFor=()=>Math.max(2200,parseInt(slides[i]?.dataset.hold||intervalMs,10)||intervalMs);
      let triLayer=slider.querySelector('.v8-tri-layer');
      if(!triLayer){
        triLayer=document.createElement('div');triLayer.className='v8-tri-layer';
        const rows=4,cols=6;
        for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
          const t=document.createElement('span');
          t.className='v8-tri '+(((r+c)%2===0)?'up':'down');
          t.style.setProperty('--r',r);t.style.setProperty('--c',c);
          const bottomFirst=(rows-1-r)*0.055,ripple=Math.abs(c-(cols-1)/2)*0.012;
          t.style.setProperty('--delay',(bottomFirst+ripple).toFixed(3)+'s');
          triLayer.appendChild(t);
        }
        slider.appendChild(triLayer);
      }
      const tris=[...triLayer.children];
      function updateText(s){
        const l=currentLang(),cap=l==='ar'?'Ar':'En';
        if(title)title.textContent=s.dataset['title'+cap]||'';
        if(sub)sub.textContent=s.dataset['sub'+cap]||'';
      }
      function settle(n){
        i=(n+slides.length)%slides.length;
        slides.forEach((s,k)=>{s.classList.remove('v8-entering','v8-leaving');s.classList.toggle('active',k===i)});
        dots.forEach((d,k)=>d.classList.toggle('active',k===i));
        updateText(slides[i]);slider.classList.remove('v8-transitioning');tris.forEach(t=>t.classList.remove('animate'));busy=false;
      }
      function show(n,immediate=false){
        const next=(n+slides.length)%slides.length;
        if(immediate||next===i){settle(next);return}if(busy)return;
        busy=true;const current=slides[i],incoming=slides[next];
        slider.classList.add('v8-transitioning');dots.forEach((d,k)=>d.classList.toggle('active',k===next));updateText(incoming);
        current.classList.remove('active');current.classList.add('v8-leaving');incoming.classList.add('v8-entering');
        tris.forEach(t=>t.classList.remove('animate'));void triLayer.offsetWidth;tris.forEach(t=>t.classList.add('animate'));
        window.setTimeout(()=>settle(next),transitionMs);
      }
      function start(){clearTimeout(timer);timer=setTimeout(()=>{show(i+1);timer=setTimeout(start,transitionMs+40)},holdFor())}
      dots.forEach((d,k)=>d.addEventListener('click',()=>{show(k);start()}));
      slider.addEventListener('mouseenter',()=>clearTimeout(timer));slider.addEventListener('mouseleave',start);
      slider.addEventListener('focusin',()=>clearTimeout(timer));slider.addEventListener('focusout',start);
      let resume3D=null;
      slider.addEventListener('pointerdown',()=>{clearTimeout(timer);clearTimeout(resume3D)});
      slider.addEventListener('pointerup',()=>{clearTimeout(resume3D);resume3D=setTimeout(start,6500)});
      slider.addEventListener('pointercancel',()=>{clearTimeout(resume3D);resume3D=setTimeout(start,6500)});
      show(0,true);start();
    });
  }

  // Lightbox with next / previous navigation and swipe support.
  const lightboxState={card:null,cards:[],index:-1,touchX:null};
  function activeScopeFor(card){
    const page=card?.closest('.previewpage');
    return page||document;
  }
  function getCards(card){
    return [...activeScopeFor(card).querySelectorAll('[data-lightbox]')].filter(el=>{
      const st=getComputedStyle(el);return st.display!=='none'&&st.visibility!=='hidden';
    });
  }
  function ensureLightbox(){
    let box=document.querySelector('.v7-lightbox');
    if(box)return box;
    box=document.createElement('div');box.className='v7-lightbox';
    box.innerHTML=`<div class="v7-lightbox-panel" role="dialog" aria-modal="true" aria-label="Feature details">
      <span class="v10-lightbox-count"></span>
      <button class="v10-lightbox-nav v10-lightbox-prev" type="button" aria-label="Previous">‹</button>
      <button class="v10-lightbox-nav v10-lightbox-next" type="button" aria-label="Next">›</button>
      <div class="v7-lightbox-media"><img alt=""></div>
      <div class="v7-lightbox-copy"><button class="v7-lightbox-close" type="button" aria-label="Close">×</button><div class="v7-lightbox-kicker">DOME OF DRUMS · FEATURE</div><h3></h3><p></p></div>
    </div>`;
    document.body.appendChild(box);
    box.addEventListener('click',e=>{if(e.target===box||e.target.closest('.v7-lightbox-close'))closeLightbox()});
    box.querySelector('.v10-lightbox-prev').addEventListener('click',e=>{e.stopPropagation();moveLightbox(-1)});
    box.querySelector('.v10-lightbox-next').addEventListener('click',e=>{e.stopPropagation();moveLightbox(1)});
    const panel=box.querySelector('.v7-lightbox-panel');
    panel.addEventListener('touchstart',e=>{lightboxState.touchX=e.changedTouches?.[0]?.clientX??null},{passive:true});
    panel.addEventListener('touchend',e=>{if(lightboxState.touchX==null)return;const x=e.changedTouches?.[0]?.clientX??lightboxState.touchX;const d=x-lightboxState.touchX;lightboxState.touchX=null;if(Math.abs(d)>55)moveLightbox(d>0?-1:1)},{passive:true});
    return box;
  }
  function renderLightbox(card){
    if(!card)return;
    const box=ensureLightbox(),l=currentLang(),cap=l==='ar'?'Ar':'En';
    box.querySelector('img').src=card.dataset.image||card.querySelector('img')?.src||'';
    box.querySelector('h3').textContent=card.dataset['title'+cap]||card.dataset.titleEn||card.querySelector('b,h3')?.textContent||'';
    box.querySelector('p').textContent=card.dataset['details'+cap]||card.dataset['short'+cap]||card.querySelector('small,p')?.textContent||'';
    lightboxState.card=card;lightboxState.cards=getCards(card);lightboxState.index=lightboxState.cards.indexOf(card);
    box.querySelector('.v10-lightbox-count').textContent=lightboxState.index>=0?`${lightboxState.index+1} / ${lightboxState.cards.length}`:'';
    const many=lightboxState.cards.length>1;box.querySelector('.v10-lightbox-prev').hidden=!many;box.querySelector('.v10-lightbox-next').hidden=!many;
  }
  function openLightbox(card){renderLightbox(card);ensureLightbox().classList.add('open');document.body.style.overflow='hidden'}
  function closeLightbox(){const box=document.querySelector('.v7-lightbox');if(box)box.classList.remove('open');document.body.style.overflow='';lightboxState.card=null}
  function moveLightbox(step){
    if(!lightboxState.cards.length)return;
    const n=(lightboxState.index+step+lightboxState.cards.length)%lightboxState.cards.length;
    renderLightbox(lightboxState.cards[n]);
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest('[data-lightbox]');
    if(card){e.preventDefault();openLightbox(card)}
  });
  document.addEventListener('keydown',e=>{
    const box=document.querySelector('.v7-lightbox.open');if(!box)return;
    if(e.key==='Escape')closeLightbox();
    if(e.key==='ArrowLeft')moveLightbox(-1);
    if(e.key==='ArrowRight')moveLightbox(1);
  });

  function init(){bindTheme();bindLang();initMobileNav();initHero();applyLang(lang)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

/* =========================================================
   V11 EXPERIMENT — interactive geodesic hero.
   No external 3D library: lightweight canvas projection so the
   standalone preview works from file:// and on mobile.
   Geometry: temporary frequency-3 icosahedral geodesic reference.
   ========================================================= */
(()=>{
  const PHI=(1+Math.sqrt(5))/2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const norm=v=>{const l=Math.hypot(v.x,v.y,v.z)||1;return{x:v.x/l,y:v.y/l,z:v.z/l}};
  const mix=(a,b,c,wa,wb,wc)=>norm({x:a.x*wa+b.x*wb+c.x*wc,y:a.y*wa+b.y*wb+c.y*wc,z:a.z*wa+b.z*wb+c.z*wc});
  function makeGeo(freq=3){
    let V=[
      {x:-1,y: PHI,z:0},{x:1,y: PHI,z:0},{x:-1,y:-PHI,z:0},{x:1,y:-PHI,z:0},
      {x:0,y:-1,z: PHI},{x:0,y:1,z: PHI},{x:0,y:-1,z:-PHI},{x:0,y:1,z:-PHI},
      {x: PHI,y:0,z:-1},{x: PHI,y:0,z:1},{x:-PHI,y:0,z:-1},{x:-PHI,y:0,z:1}
    ].map(norm);
    const F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
    const verts=[],vmap=new Map(),edges=new Map();
    function key(p){return [p.x,p.y,p.z].map(n=>Math.round(n*1e6)).join(',')}
    function addV(p){const k=key(p);if(vmap.has(k))return vmap.get(k);const id=verts.length;verts.push(p);vmap.set(k,id);return id}
    function addE(a,b){if(a===b)return;const k=a<b?a+':'+b:b+':'+a;edges.set(k,[a,b])}
    F.forEach(face=>{
      const a=V[face[0]],b=V[face[1]],c=V[face[2]],grid=[];
      for(let i=0;i<=freq;i++){
        grid[i]=[];
        for(let j=0;j<=freq-i;j++){
          const wa=(freq-i-j)/freq,wb=i/freq,wc=j/freq;
          grid[i][j]=addV(mix(a,b,c,wa,wb,wc));
        }
      }
      for(let i=0;i<freq;i++)for(let j=0;j<freq-i;j++){
        const A=grid[i][j],B=grid[i+1][j],C=grid[i][j+1];
        addE(A,B);addE(B,C);addE(C,A);
        if(j<freq-i-1){const D=grid[i+1][j+1];addE(B,D);addE(D,C);addE(C,B)}
      }
    });
    // Keep a clean upper cap. The temporary model is only for interaction testing.
    const cut=-0.035;
    const kept=[...edges.values()].filter(([a,b])=>verts[a].y>=cut&&verts[b].y>=cut);
    let minY=Infinity,maxY=-Infinity;
    kept.forEach(([a,b])=>{minY=Math.min(minY,verts[a].y,verts[b].y);maxY=Math.max(maxY,verts[a].y,verts[b].y)});
    const out=verts.map(p=>({x:p.x,y:(p.y-minY),z:p.z}));
    // center horizontally and keep top around 1.7 units high.
    const h=Math.max(.001,maxY-minY),sc=1.65/h;
    out.forEach(p=>{p.x*=sc;p.y*=sc;p.z*=sc});
    const lengths=kept.map(([a,b])=>Math.hypot(out[a].x-out[b].x,out[a].y-out[b].y,out[a].z-out[b].z));
    const sorted=[...lengths].sort((a,b)=>a-b),q1=sorted[Math.floor(sorted.length*.34)],q2=sorted[Math.floor(sorted.length*.68)];
    return{verts:out,edges:kept,lengths,q1,q2};
  }
  const GEO=makeGeo(3);
  function initViewer(shell){
    if(shell.dataset.dome3dInit==='1')return;shell.dataset.dome3dInit='1';
    const canvas=shell.querySelector('canvas'),ctx=canvas.getContext('2d',{alpha:true});
    let yaw=-.58,pitch=-.23,zoom=1,mode='wire',drag=false,px=0,py=0,auto=true,lastPinch=null,raf=0;
    function resize(){const r=shell.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
    function transform(p){
      const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
      let x=p.x*cy+p.z*sy,z=-p.x*sy+p.z*cy,y=p.y;
      const yy=y*cp-z*sp,zz=y*sp+z*cp;return{x,y:yy,z:zz};
    }
    function project(p,w,h){const cam=5.4,den=Math.max(2.5,cam-p.z),s=Math.min(w,h)*1.36*zoom/den;return{x:w*.51+p.x*s,y:h*.76-p.y*s,z:p.z,s}}
    function palette(){const dark=document.documentElement.dataset.theme==='dark';return dark?{wire:'#aeb99a',edge:'#cfb887',edge2:'#e0c99e',edge3:'#ad9672',outline:'rgba(5,7,5,.72)',muted:'rgba(167,178,151,.24)',orange:'#e57c33',node:'#f0dfbf',ground:'rgba(158,170,117,.20)'}:{wire:'#5f6d4c',edge:'#b58b59',edge2:'#c99d65',edge3:'#9a744e',outline:'rgba(44,39,29,.55)',muted:'rgba(85,96,72,.20)',orange:'#d96f2b',node:'#5c513d',ground:'rgba(70,81,58,.16)'}}
    function draw(){
      const w=shell.clientWidth,h=shell.clientHeight;if(!w||!h){raf=requestAnimationFrame(draw);return}
      ctx.clearRect(0,0,w,h);const pal=palette();
      const pts=GEO.verts.map(v=>project(transform(v),w,h));
      // subtle ground ellipse
      ctx.beginPath();ctx.ellipse(w*.51,h*.77,Math.min(w,h)*.29*zoom,Math.min(w,h)*.045*zoom,0,0,Math.PI*2);ctx.strokeStyle=pal.ground;ctx.lineWidth=1;ctx.stroke();
      const order=GEO.edges.map((e,idx)=>({e,idx,z:(pts[e[0]].z+pts[e[1]].z)/2})).sort((a,b)=>a.z-b.z);
      order.forEach(({e,idx})=>{
        const a=pts[e[0]],b=pts[e[1]],L=GEO.lengths[idx];
        if(mode==='wire'){
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=pal.wire;ctx.globalAlpha=.78;ctx.lineWidth=1.25;ctx.stroke();
        }else{
          const hi=mode==='highlight'&&(idx%11===0||idx%17===0||idx%23===0);
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.globalAlpha=hi?1:(mode==='highlight'?.58:.96);ctx.strokeStyle=pal.outline;ctx.lineWidth=mode==='highlight'?7.2:7.8;ctx.lineCap='round';ctx.stroke();
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);let c=L<GEO.q1?pal.edge:L<GEO.q2?pal.edge2:pal.edge3;if(hi)c=pal.orange;ctx.strokeStyle=c;ctx.lineWidth=mode==='highlight'?4.6:5.2;ctx.stroke();
        }
      });
      if(mode!=='wire'){
        const used=new Set();GEO.edges.forEach(e=>{used.add(e[0]);used.add(e[1])});
        [...used].forEach(i=>{const p=pts[i];ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(p.x,p.y,1.7,0,Math.PI*2);ctx.fillStyle=pal.node;ctx.fill()});
      }
      ctx.globalAlpha=1;
      if(auto&&!drag)yaw+=.0018;
      raf=requestAnimationFrame(draw);
    }
    function down(x,y){drag=true;auto=false;px=x;py=y}
    function move(x,y){if(!drag)return;const dx=x-px,dy=y-py;px=x;py=y;yaw+=dx*.008;pitch=clamp(pitch+dy*.006,-.78,.38)}
    function up(){drag=false}
    shell.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;shell.setPointerCapture?.(e.pointerId);down(e.clientX,e.clientY)});
    shell.addEventListener('pointermove',e=>move(e.clientX,e.clientY));shell.addEventListener('pointerup',up);shell.addEventListener('pointercancel',up);
    shell.addEventListener('wheel',e=>{e.preventDefault();auto=false;zoom=clamp(zoom*(e.deltaY>0?.92:1.08),.68,1.75)},{passive:false});
    shell.addEventListener('touchmove',e=>{if(e.touches.length===2){e.preventDefault();auto=false;const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(lastPinch)zoom=clamp(zoom*(d/lastPinch),.68,1.75);lastPinch=d}},{passive:false});
    shell.addEventListener('touchend',()=>lastPinch=null,{passive:true});
    shell.querySelectorAll('[data-3d-mode]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();mode=btn.dataset['3dMode'];auto=false;shell.querySelectorAll('[data-3d-mode]').forEach(b=>b.classList.toggle('active',b===btn))}));
    shell.querySelector('[data-3d-reset]')?.addEventListener('click',e=>{e.stopPropagation();yaw=-.58;pitch=-.23;zoom=1;auto=true});
    const ro=new ResizeObserver(resize);ro.observe(shell);resize();draw();
    // Suspend drawing when the page is hidden.
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0}else if(!document.hidden&&!raf)draw()});
  }
  function boot(){document.querySelectorAll('[data-dome3d]').forEach(initViewer)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
