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


/* DoD | Pages CMS bridge — safe text/color overrides, original site stays intact. */
(function () {
  'use strict';
  var endpoint = '/assets/data/dod-site-settings.json';
  function validHex(s) { return typeof s === 'string' && /^#[\da-fA-F]{6}$/.test(s); }
  function escapeHTML(s) {
    var temp = document.createElement('span');
    temp.textContent = s;
    return temp.innerHTML;
  }
  function plainText(html) {
    var temp = document.createElement('span');
    temp.innerHTML = html;
    return temp.textContent.trim();
  }
  function setLocalized(el, en, ar) {
    if (!el) return;
    var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
    [['en',en],['ar',ar]].forEach(function (entry) {
      var code = entry[0], value = entry[1];
      if (typeof value !== 'string' || !value.trim()) return;
      var old = el.getAttribute('data-' + code) || '';
      if (old && plainText(old) === value.trim()) return; // preserve original italics when unchanged
      el.setAttribute('data-' + code, escapeHTML(value.trim()));
      if (lang === code) el.textContent = value.trim();
    });
  }
  function setPrice(el, prefix, n) {
    if (!el || !Number.isFinite(n) || n < 0) return;
    var nodes = Array.from(el.childNodes);
    var text = nodes.find(function(node) { return node.nodeType === 3; });
    if (!text) { text = document.createTextNode(''); el.appendChild(text); }
    text.textContent = prefix + n.toLocaleString('en-US') + ' ';
  }
  function setRemaining(el, remaining, total) {
    if (!el || !Number.isInteger(remaining) || !Number.isInteger(total) || total < 1 || remaining < 0) return;
    var en = remaining + ' OF THE FIRST ' + total + ' LICENSES REMAIN';
    var ar = 'متبقي ' + remaining + ' من أول ' + total + ' رخصة';
    // Availability counts are plain text. Keep the page's language-switching attributes intact.
    el.setAttribute('data-en',en); el.setAttribute('data-ar',ar);
    el.textContent = document.documentElement.lang === 'ar' ? ar : en;
  }
  function apply(s) {
    if (!s || typeof s !== 'object') return;
    if (validHex(s.accent_color)) document.documentElement.style.setProperty('--orange',s.accent_color);
    if (validHex(s.dark_green_color)) document.documentElement.style.setProperty('--deep',s.dark_green_color);
    var price = Number(s.license_price_usd);
    if (s.license_price_usd !== '' && s.license_price_usd !== null && Number.isFinite(price) && price >= 0) {
      setPrice(document.querySelector('.dod-v23-launch-price'),' ',price); // keep existing $ span
      setPrice(document.querySelector('.dod-v23-install-amount'),'$',price);
    }
    setRemaining(document.querySelector('.dod-v23-install-left'), Number(s.available_licenses), Number(s.launch_license_total));
    setLocalized(document.querySelector('.v7-hero-copy h1'), s.studio_heading_en, s.studio_heading_ar);
    setLocalized(document.querySelector('.v7-hero-copy > p'), s.studio_description_en, s.studio_description_ar);
    setLocalized(document.querySelector('h1[data-en="Founding Launch Offer"]'), s.pricing_heading_en, s.pricing_heading_ar);
    if (typeof s.first_studio_image === 'string' && /^\/assets\/images\/[\w./-]+\.(?:png|jpe?g|webp|svg)$/i.test(s.first_studio_image) && !s.first_studio_image.includes('..')) {
      var img = document.querySelector('.v7-hero-slider .v7-slide:first-child img');
      if (img) img.src = s.first_studio_image;
    }
  }
  function start() {
    fetch(endpoint, {cache:'no-store'})
      .then(function(response){ if (!response.ok) throw new Error('No site settings'); return response.json(); })
      .then(apply)
      .catch(function(){ /* Site still renders from its original HTML if CMS config is missing. */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
