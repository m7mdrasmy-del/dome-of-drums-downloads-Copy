/* Dome of Drums · official contacts, copy controls and verifiable trial file link */
(function(){
  'use strict';
  const s=window.DOD_PUBLIC_SETTINGS || {};
  const els=(q)=>Array.from(document.querySelectorAll(q));
  const isAR=()=>document.documentElement.lang==='ar';
  const ICONS={
    email:`<svg class="dod-contact-icon dod-icon-email" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>`,
    whatsapp:`<svg class="dod-contact-icon dod-icon-whatsapp" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.4 11.5a8.4 8.4 0 0 1-12.7 7.2L3 20l1.4-4.3A8.4 8.4 0 1 1 20.4 11.5Z"/><path d="M9 8.9c-.4 0-.7.5-.7 1.3 0 2.1 3.3 5.1 5.5 5.4.7.1 1.4-.6 1.3-1l-.2-.8c-.1-.3-.4-.3-.7-.2l-.8.4c-1.1-.5-2.2-1.5-2.7-2.7l.4-.8c.2-.3.1-.6-.2-.7L9.5 9c-.2-.1-.3-.1-.5-.1Z"/></svg>`,
    copy:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>`
  };
  async function writeCopy(value){
    if(navigator.clipboard && window.isSecureContext){
      try{ await navigator.clipboard.writeText(value); return true; }catch(e){}
    }
    // Works in browsers that still support this fallback (including some file:// previews).
    const field=document.createElement('textarea');
    field.value=value;field.readOnly=true;
    field.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(field);field.select();
    let ok=false;
    try{ok=document.execCommand('copy');}catch(e){}
    field.remove();return ok;
  }
  function ensureRow(el,kind){
    let row=el.parentElement?.classList.contains('dod-contact-entry')?el.parentElement:null;
    if(row)return row;
    row=document.createElement('div');row.className='dod-contact-entry';
    el.parentNode.insertBefore(row,el);row.appendChild(el);
    const btn=document.createElement('button');
    btn.type='button';btn.className='dod-copy-button';
    btn.setAttribute('data-dod-copy-button',kind);
    btn.innerHTML=ICONS.copy+'<span class="dod-copy-label"></span>';
    btn.addEventListener('click',async()=>{
      const val=btn.dataset.copyValue||'';if(!val)return;
      const ok=await writeCopy(val);
      const txt=btn.querySelector('.dod-copy-label');
      if(txt)txt.textContent=ok?(isAR()?'تم النسخ!':'Copied!'):(isAR()?'فشل النسخ':'Copy failed');
      btn.classList.toggle('is-copied',ok);
      clearTimeout(btn._resetTimer);
      btn._resetTimer=setTimeout(()=>{btn.classList.remove('is-copied');labelButton(btn,kind)},1900);
    });
    row.appendChild(btn);
    return row;
  }
  function labelButton(btn,kind){
    const txt=btn.querySelector('.dod-copy-label');
    if(txt)txt.textContent=isAR()?'نسخ':'Copy';
    btn.setAttribute('aria-label',isAR()?(kind==='email'?'نسخ البريد الإلكتروني':'نسخ رقم الواتساب'):(kind==='email'?'Copy email address':'Copy WhatsApp number'));
  }
  function refreshContacts(){
    const email=(s.email||'').trim();
    const whatsapp=(s.whatsapp||'').replace(/\D/g,'');
    for (const [kind,selector,value,href] of [
      ['email','[data-dod-email]',email,'mailto:'+email],
      ['whatsapp','[data-dod-whatsapp]',whatsapp,'https://wa.me/'+whatsapp+'?text='+encodeURIComponent('Hello, I would like information about Dome of Drums Studio activation and payment.')]
    ]){
      els(selector).forEach(el=>{
        const row=ensureRow(el,kind);
        let valueEl=el.querySelector('.dod-contact-value');
        if(!valueEl){
          el.innerHTML=ICONS[kind]+'<span class="dod-contact-value"></span>';
          valueEl=el.querySelector('.dod-contact-value');
        }
        valueEl.textContent=value?(kind==='whatsapp'?'+'+whatsapp:email):(isAR()?'بانتظار معلومات التواصل':'Contact details pending');
        if(value){el.href=href;el.classList.remove('dod-unset')}
        else {el.removeAttribute('href');el.classList.add('dod-unset')}
        const btn=row.querySelector('.dod-copy-button');
        if(btn){btn.dataset.copyValue=(kind==='whatsapp'?'+'+whatsapp:email);btn.disabled=!value;labelButton(btn,kind)}
      });
    }
  }
  // Both access paths use the same installer; only activation entitlements differ.
  // Never offer a missing asset or an HTML fallback instead of the signed installer.
  async function verifyTrial(){
    const file=s.trialFile||'/downloads/dome-of-drums-installer.rbz';
    const buttons=els('[data-dod-download-rbz]');
    if(!buttons.length)return;
    let ok=false;
    try{
      const head=await fetch(file,{method:'HEAD',cache:'no-store'});
      const typ=(head.headers.get('content-type')||'').toLowerCase();
      const len=Number(head.headers.get('content-length')||0);
      if(head.ok && !/text\/html|application\/json|text\/plain/.test(typ) && (len===0 || len>100)){
        const check=await fetch(file,{headers:{Range:'bytes=0-3'},cache:'no-store'});
        if(check.ok && !/text\/html|application\/json|text\/plain/.test((check.headers.get('content-type')||'').toLowerCase())){
          const reader=check.body?.getReader();
          if(reader){const first=await reader.read();await reader.cancel().catch(()=>{});
            const bytes=first.value||new Uint8Array();
            ok=bytes.length>=4&&bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===0x03&&bytes[3]===0x04;
          } else {
            const bytes=new Uint8Array((await check.arrayBuffer()).slice(0,4));
            ok=bytes.length===4&&bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===0x03&&bytes[3]===0x04;
          }
        }
      }
    }catch(e){}
    const label=isAR()?'تحميل البرنامج (.RBZ)':'Download Dome of Drums (.RBZ)';
    buttons.forEach(b=>{
      if(ok){
        b.href=file;b.setAttribute('download',s.trialFilename||'dome-of-drums-installer.rbz');
        b.removeAttribute('aria-disabled');b.classList.remove('dod-disabled');
        b.textContent=label;
      }else{
        b.removeAttribute('href');b.removeAttribute('download');b.setAttribute('aria-disabled','true');
        b.classList.add('dod-disabled');
        b.textContent=isAR()?'التنزيل غير متاح مؤقتًا':'Download temporarily unavailable';
      }
    });
    els('[data-dod-trial-status],[data-dod-package-status]').forEach(el=>el.textContent=ok?
      (isAR()?'ملف التثبيت متاح للتحميل. لتفعيل المزايا الكاملة، يرجى التواصل معنا.':'Installer available. Contact us to activate full functionality.'):
      (isAR()?'سيُتاح ملف RBZ الرسمي للتحميل عند رفعه. لا يوجد ملف تجريبي حاليًا.':'The official RBZ installer has not been uploaded yet.'));
  }
  document.addEventListener('DOMContentLoaded',()=>{
    refreshContacts();verifyTrial();
    document.querySelectorAll('.lang-toggle').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{refreshContacts();verifyTrial()},0)));
  });
})();
