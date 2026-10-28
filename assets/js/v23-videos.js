
(function(){
  'use strict';
  document.addEventListener('DOMContentLoaded',function(){
    const frame=document.getElementById('dod-v23-youtube-player');
    const link=document.getElementById('dod-v23-youtube-link');
    const label=document.getElementById('dod-v23-playing-label');
    const buttons=Array.from(document.querySelectorAll('.dod-v23-video-choice'));
    if(!frame||!link||!label||!buttons.length)return;
    const isAR=()=>document.documentElement.lang==='ar';
    buttons.forEach(button=>button.addEventListener('click',function(){
      const id=this.dataset.videoId;
      if(!/^[a-zA-Z0-9_-]{11}$/.test(id))return;
      const index=String(this.dataset.videoIndex||'1').padStart(2,'0');
      frame.src='https://www.youtube-nocookie.com/embed/'+id+'?rel=0&autoplay=1';
      frame.title='Dome of Drums · Video '+index;
      link.href='https://youtu.be/'+id;
      label.dataset.en='VIDEO '+index+' OF 03';
      label.dataset.ar='الفيديو '+index+' من 03';
      label.textContent=isAR()?label.dataset.ar:label.dataset.en;
      buttons.forEach(b=>{
        const selected=b===button;
        b.classList.toggle('is-selected',selected);
        b.setAttribute('aria-pressed',selected?'true':'false');
      });
    }));
  });
})();
