/*
==================================================
666SOUNDsDESIGn — Discord Embed Addon v83
Created: 2026-05-05
Purpose: PC+iPhone Discord embed panel, add-only, no secrets.
==================================================
*/
(function installDiscordEmbedV83(){
 if(window.__discordEmbedV83Installed)return;window.__discordEmbedV83Installed=true;
 const DEFAULT_SRC="https://webradio.666soundsdesign-broadcaster.com/assets/discord/discord-preview.svg"; const qs=id=>document.getElementById(id);
 function src(){return String(window.DISCORD_EMBED_URL||document.body.getAttribute('data-discord-embed-url')||DEFAULT_SRC||'').trim()}
 function panel(){
  let p=qs('discordEmbedPanel'); if(p)return p;
  p=document.createElement('section');p.id='discordEmbedPanel';p.className='discord-embed-panel hidden';p.setAttribute('aria-label','Discord Embed');
  const h=document.createElement('div');h.className='discord-embed-header';
  const t=document.createElement('div');t.className='discord-embed-title';t.textContent='DISCORD';
  const c=document.createElement('button');c.id='discordEmbedClose';c.className='discord-embed-close';c.type='button';c.textContent='×';c.setAttribute('aria-label','Discord schließen');
  h.appendChild(t);h.appendChild(c);
  const b=document.createElement('div');b.className='discord-embed-body';
  if(src()){const f=document.createElement('iframe');f.id='discordEmbedFrame';f.className='discord-embed-frame';f.src=src();f.loading='lazy';f.referrerPolicy='no-referrer-when-downgrade';f.allow='clipboard-write; fullscreen';f.setAttribute('sandbox','allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-forms');b.appendChild(f);}
  else{const e=document.createElement('div');e.className='discord-embed-empty';e.innerHTML='<strong>Discord Embed nicht konfiguriert.</strong><br>window.DISCORD_EMBED_URL setzen.';b.appendChild(e);}
  p.appendChild(h);p.appendChild(b);document.body.appendChild(p);c.addEventListener('click',close);return p;
 }
 function button(){
  let b=qs('discordEmbedToggle');if(b)return b;
  b=document.createElement('button');b.id='discordEmbedToggle';b.className='status-chip led-state discord-embed-toggle state-off';b.type='button';b.title='Discord öffnen';b.setAttribute('aria-label','Discord öffnen');b.innerHTML='<span class="status-dot"></span><span class="status-code">DC</span>';
  const right=document.querySelector('.systempanel-right'), hist=qs('historyToggle');
  if(right)right.insertBefore(b,right.firstChild); else if(hist)hist.insertAdjacentElement('afterend',b); else document.body.appendChild(b);
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggle();});
  return b;
 }
 function open(){const p=panel(),b=button();p.classList.remove('hidden');b.classList.remove('state-off');b.classList.add('state-api','is-active');document.body.classList.add('discord-embed-open');}
 function close(){const p=qs('discordEmbedPanel'),b=qs('discordEmbedToggle');if(p)p.classList.add('hidden');if(b){b.classList.remove('state-api','is-active');b.classList.add('state-off');}document.body.classList.remove('discord-embed-open');}
 function toggle(){const p=panel();p.classList.contains('hidden')?open():close();}
 function boot(){button();panel();close();document.addEventListener('click',e=>{const p=qs('discordEmbedPanel'),b=qs('discordEmbedToggle');if(!p||p.classList.contains('hidden'))return;if(p.contains(e.target)||(b&&b.contains(e.target)))return;close();},true);document.addEventListener('keydown',e=>{if(e.key==='Escape')close();},{passive:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
