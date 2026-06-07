
/* 666SOUNDsDESIGn — v8 Broadcast Emoji Reactivation
   Reaktiviert vorhandene Broadcast-/Message-Eingaben. Keine neue Messenger-UI. */
(function(){
  'use strict';
  if(window.__S666_BROADCAST_EMOJI_V8__) return; window.__S666_BROADCAST_EMOJI_V8__=true;
  const EMOJIS=['🔥','💀','🖤','⚡','🎧','🚀','👽','🔊'];
  function qs(s,r){return (r||document).querySelector(s)}
  function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function insertText(t,v){ if(!t)return; const a=t.selectionStart||t.value.length, b=t.selectionEnd||t.value.length; t.value=t.value.slice(0,a)+v+t.value.slice(b); const p=a+v.length; try{t.setSelectionRange(p,p); t.focus(); t.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){} }
  function makeBar(targetId){ const bar=document.createElement('div'); bar.className='s666-emoji-bar'; bar.dataset.emojiFor=targetId; EMOJIS.forEach(e=>{const b=document.createElement('button'); b.type='button'; b.className='s666-emoji-btn'; b.textContent=e; b.title='Emoji einfügen '+e; b.setAttribute('aria-label','Emoji einfügen '+e); b.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();insertText(document.getElementById(targetId),e);},true); bar.appendChild(b);}); return bar; }
  function bindPc(){ const box=qs('#playerAlertPcBox'); const txt=qs('#playerAlertPcText'); if(!box||!txt||qs('.s666-emoji-bar[data-emoji-for="playerAlertPcText"]',box))return; const send=qs('#playerAlertPcSend',box); const bar=makeBar('playerAlertPcText'); if(send)send.insertAdjacentElement('afterend',bar); else box.appendChild(bar); }
  function bindMobile(){ const txt=qs('#mffAlertText'); if(txt&&!qs('.s666-emoji-bar[data-emoji-for="mffAlertText"]')){ const actions=qs('.mff-alert-editor-actions') || txt.parentNode; if(actions)actions.insertBefore(makeBar('mffAlertText'), actions.firstChild); }
    const open=qs('#mffAlertOpen'); if(open)open.title='Message / Broadcast öffnen'; }
  function boot(){bindPc();bindMobile(); qsa('#playerAlertPcText,#mffAlertText').forEach(t=>{t.style.pointerEvents='auto';t.disabled=false;});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.addEventListener('load',boot,{passive:true}); setTimeout(boot,250); setTimeout(boot,1000); setInterval(boot,2000);
})();
