/*
 * 666SOUNDsDESIGn Player Stage V10.1.
 * Reiner MeterBus-Konsument: Header, Now Playing, Buttons, Status-LEDs und Panelmodule.
 * EQ, Außenmeter und Bottom-Meter werden ausschließlich von equalizer.js geschrieben.
 */
(function(){
  'use strict';
  if(window.__S666_PLAYER_STAGE_V2_CORRECTION__) return;
  window.__S666_PLAYER_STAGE_V2_CORRECTION__ = true;

  var state={smooth:Object.create(null),lastTitle:'',lastFrame:0,normalizeQueued:false};
  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function clamp(v,a,b){v=Number(v)||0;return Math.max(a,Math.min(b,v));}
  function avg(values,fallback){if(!values||!values.length)return fallback||0;return values.reduce(function(sum,value){return sum+(Number(value)||0);},0)/values.length;}
  function smooth(key,target,attack,release){var prev=Number(state.smooth[key]||0);var rate=target>prev?(attack||.72):(release||.18);var next=prev+(target-prev)*rate;state.smooth[key]=next;return next;}
  function cleanTitle(value){return String(value||'').replace(/\s+/g,' ').replace(/^NOW\s*PLAYING\s*[:\-–—]?\s*/i,'').trim();}

  function toast(message,type){
    var old=q('#s666StageToast');if(old)old.remove();
    var node=document.createElement('div');node.id='s666StageToast';node.className='s666-stage-toast'+(type==='error'?' is-error':'');node.textContent=message;
    document.body.appendChild(node);requestAnimationFrame(function(){node.classList.add('is-visible');});
    setTimeout(function(){node.classList.remove('is-visible');setTimeout(function(){node.remove();},240);},2600);
  }

  async function openDiscordShooter(){
    try{
      if(window.S666DiscordPlayerAddonV3&&typeof window.S666DiscordPlayerAddonV3.messagePost==='function'){
        await window.S666DiscordPlayerAddonV3.messagePost();toast('Discord Shooter geöffnet.');
      }else throw new Error('discord_addon_not_ready');
    }catch(error){toast(error&&error.message?error.message:'Discord Shooter ist nicht bereit.','error');}
  }

  async function requestSkip(){
    if(!window.confirm('Aktuellen Auto-DJ-Titel wirklich überspringen?'))return false;
    if(!window.S666SkipControl||typeof window.S666SkipControl.skip!=='function'){toast('Auto-DJ Skip ist nicht bereit.','error');return false;}
    var result=await window.S666SkipControl.skip({source:'player-stage-v2',prompt:'Admin-Passwort für Auto-DJ Skip eingeben:'});
    if(result&&result.ok)toast('AUTO-DJ SKIP ausgeführt.');else toast(result&&result.error?result.error:'Auto-DJ Skip abgelehnt.','error');
    return !!(result&&result.ok);
  }

  function installTouchFeedback(){
    if(document.documentElement.dataset.s666StageTouchFeedback==='1')return;
    document.documentElement.dataset.s666StageTouchFeedback='1';
    var selector='#mffApp button,#mffApp a[href],.player-shell button,.player-shell a[href],.player-shell [role="button"]';
    var pressed=null,timer=0;
    function release(delay){clearTimeout(timer);var current=pressed;timer=setTimeout(function(){if(!current)return;current.classList.remove('is-pressed');current.removeAttribute('data-s666-press');if(pressed===current)pressed=null;},delay||0);}
    function press(target){var control=target&&target.closest?target.closest(selector):null;if(!control||control.disabled||control.getAttribute('aria-disabled')==='true')return;if(pressed&&pressed!==control)release(0);pressed=control;clearTimeout(timer);control.classList.add('is-pressed');control.setAttribute('data-s666-press','1');}
    document.addEventListener('pointerdown',function(event){press(event.target);},{capture:true,passive:true});
    document.addEventListener('pointerup',function(){release(150);},{capture:true,passive:true});
    document.addEventListener('pointercancel',function(){release(0);},{capture:true,passive:true});
    document.addEventListener('touchend',function(){release(170);},{capture:true,passive:true});
    window.addEventListener('blur',function(){release(0);},{passive:true});
  }

  function makeButton(id,label,action){var button=document.createElement('button');button.id=id;button.type='button';button.textContent=label;button.setAttribute('data-action',action);button.className='s666-cockpit-action';return button;}
  function ensureActionButtons(){
    var toolbar=q('.player-shell .bottom-console .control-toolbar');
    if(toolbar){
      var discord=q('#s666StageDiscord',toolbar);if(!discord){discord=makeButton('s666StageDiscord','DISCORD SHOOTER','discord');toolbar.appendChild(discord);}discord.classList.add('s666-cockpit-action');if(!discord.__bound){discord.__bound=true;discord.onclick=openDiscordShooter;}
      var skip=q('#s666StageSkip',toolbar);if(!skip){skip=makeButton('s666StageSkip','AUTO-DJ SKIP','skip');toolbar.appendChild(skip);}skip.classList.add('s666-cockpit-action');if(!skip.__bound){skip.__bound=true;skip.onclick=requestSkip;}
    }
    var mobileSlot=q('#mffApp .mff-discord-slot');
    if(mobileSlot&&!q('#s666StageMobileActions',mobileSlot)){
      var row=document.createElement('div');row.id='s666StageMobileActions';
      var md=makeButton('s666StageMobileDiscord','DISCORD','discord');var ms=makeButton('s666StageMobileSkip','AUTO-DJ SKIP','skip');md.onclick=openDiscordShooter;ms.onclick=requestSkip;row.append(md,ms);mobileSlot.appendChild(row);
    }
  }

  function ensureMainHeader(){
    var hero=q('body[data-veluna-page="main"] .player-shell>.hero');
    if(hero&&hero.dataset.s666HeaderReady!=='1'){
      hero.dataset.s666HeaderReady='1';hero.classList.add('s666-main-header');hero.innerHTML='';
      var image=new Image();image.className='s666-main-header-image';image.src='/assets/veluna/header/veluna-player-header.webp';image.alt='LYVRA · 666 PLAYER';image.decoding='async';image.fetchPriority='high';
      var line=document.createElement('div');line.className='s666-main-header-line';line.textContent='© 666SOUNDsDESIGn WebRadio · CYBERSTREAM COCKPIT EDITION · Fragglepower666 · 2026';
      hero.append(image,line);
    }
    qa('body[data-veluna-page="main"]>.veluna-global-header,body[data-veluna-page="main"] .frame-stage>.veluna-global-header').forEach(function(node){node.remove();});
    var mobile=q('#mffApp .mff-cyber-header');
    if(mobile){
      mobile.classList.add('s666-mobile-header');
      var images=qa('img',mobile);images.slice(1).forEach(function(item){item.remove();});
      var first=images[0];if(!first){first=new Image();mobile.prepend(first);}
      if(first.getAttribute('src')!=='/assets/veluna/header/veluna-player-header.webp')first.src='/assets/veluna/header/veluna-player-header.webp';
      first.alt='LYVRA · 666 PLAYER';first.className='s666-mobile-header-image';
    }
  }

  function titleFromDesktop(){
    var candidates=[q('.now-playing .meta-line'),q('#nowPlayingTicker'),q('.now-playing .ticker-text')];
    for(var i=0;i<candidates.length;i++){var text=cleanTitle(candidates[i]&&candidates[i].textContent);if(text&&text.toLowerCase()!=='loading metadata')return text;}
    return '';
  }

  function normalizeDesktopNowPlaying(){
    var panel=q('body[data-veluna-page="main"] .player-shell>.now-playing');if(!panel)return;
    panel.classList.add('s666-now-playing-canonical');
    var topline=q('.section-topline',panel);if(!topline)return;
    var textBox=topline.firstElementChild||topline;
    var kicker=q('.section-kicker',textBox);if(!kicker){kicker=document.createElement('div');kicker.className='section-kicker';textBox.prepend(kicker);}if(kicker.textContent!=='NOW PLAYING')kicker.textContent='NOW PLAYING';
    var staticTitle=q('.meta-line',textBox);if(!staticTitle){staticTitle=document.createElement('div');staticTitle.className='meta-line';textBox.appendChild(staticTitle);}staticTitle.classList.add('s666-now-static-title');
    var title=titleFromDesktop()||state.lastTitle||'666SOUNDsDESIGn WebRadio';state.lastTitle=title;if(cleanTitle(staticTitle.textContent)!==title)staticTitle.textContent=title;
    var ticker=q('#nowPlayingTicker',panel)||q('.ticker-text',panel);if(ticker){ticker.classList.add('s666-title-marquee');if(cleanTitle(ticker.textContent)!==title)ticker.textContent=title;var label='Aktueller Titel: '+title;if(ticker.getAttribute('aria-label')!==label)ticker.setAttribute('aria-label',label);}
  }

  function normalizeMobileNowPlaying(){
    var app=q('#mffApp');if(!app)return;
    var small=q('.mff-title small',app);if(small&&small.textContent!=='NOW PLAYING')small.textContent='NOW PLAYING';
    var mobileTitle=q('.mff-title h1 span',app)||q('.mff-title h1',app);if(mobileTitle){var value=cleanTitle(mobileTitle.textContent);if(value)state.lastTitle=value;mobileTitle.classList.add('s666-title-marquee');}
    ensureMainHeader();
  }

  function sidePanel(side){
    var tower=q(side==='left'?'#pcLeftFxAddon .pc-addon-tower':'#pcRightFxAddon .pc-addon-tower');if(!tower)return;
    var id=side==='left'?'s666LeftStatusPanel':'s666RightStatusPanel';if(q('#'+id,tower))return;
    var panel=document.createElement('section');panel.id=id;panel.className='s666-side-status-panel';panel.dataset.side=side;
    var labels=side==='left'?['INPUT','RMS','PEAK','BUS']:['MAIN','BACK','META','SYNC'];
    panel.innerHTML='<div class="s666-side-status-title"><span>'+(side==='left'?'SIGNAL CORE':'ROUTE CORE')+'</span><b>LIVE</b></div><div class="s666-side-status-grid">'+labels.map(function(label){return'<span class="s666-side-led" data-led="'+label.toLowerCase()+'"><i></i><b>'+label+'</b></span>';}).join('')+'</div>';
    tower.appendChild(panel);
  }

  function driveSideLeds(bus,level,peak){
    var age=bus&&bus.ts?Date.now()-bus.ts:99999;var live=age<900&&bus&&bus.source!=='synthetic';
    function led(panel,key,on,cls){var element=q('#'+panel+' [data-led="'+key+'"]');if(!element)return;element.classList.remove('is-on','is-peak','is-back','is-warn');if(on)element.classList.add(cls||'is-on');}
    led('s666LeftStatusPanel','input',!!bus&&age<900);led('s666LeftStatusPanel','rms',level>.07);led('s666LeftStatusPanel','peak',peak>.58,'is-peak');led('s666LeftStatusPanel','bus',live);
    var source=q('#statusSource');var backup=!!(source&&(source.classList.contains('state-backup')||source.classList.contains('state-fallback')));led('s666RightStatusPanel','main',!backup&&live);led('s666RightStatusPanel','back',backup,'is-back');
    var meta=q('#statusMeta');led('s666RightStatusPanel','meta',!!(meta&&(meta.classList.contains('state-api')||meta.classList.contains('is-active'))));led('s666RightStatusPanel','sync',live&&level>.035);
  }

  function drivePanelModules(bus,level,peak,pulse){
    var eq=bus&&Array.isArray(bus.eq)?bus.eq:[];var low=avg(eq.slice(0,Math.max(1,Math.floor(eq.length*.34))),level);var mid=avg(eq.slice(Math.floor(eq.length*.28),Math.max(2,Math.floor(eq.length*.70))),level);var high=avg(eq.slice(Math.floor(eq.length*.62)),level);
    document.documentElement.style.setProperty('--s666-stage-level',level.toFixed(3));document.documentElement.style.setProperty('--s666-stage-peak',peak.toFixed(3));
    qa('.pc-addon-waveform i').forEach(function(element,index){var source=index%3===0?low:index%3===1?mid:high;var value=smooth('wave'+index,clamp(source*.72+pulse*.28,0,1),.76,.20);element.style.height=(12+value*84).toFixed(1)+'%';element.style.opacity=(.32+value*.68).toFixed(2);});
    qa('.pc-addon-beatline i').forEach(function(element,index){var value=smooth('beat'+index,clamp(pulse*(.62+(index%2)*.30)+peak*.24,0,1),.82,.16);element.style.height=(10+value*86).toFixed(1)+'%';element.style.opacity=(.28+value*.72).toFixed(2);});
    qa('.pc-addon-vu-grid .pc-vu-channel:first-child i').forEach(function(element,index){var value=smooth('vuL'+index,clamp((index?mid:low)*.64+level*.36,0,1),.78,.18);element.style.height=(8+value*90).toFixed(1)+'%';});
    qa('.pc-addon-vu-grid .pc-vu-channel:last-child i').forEach(function(element,index){var value=smooth('vuR'+index,clamp((index?high:mid)*.64+peak*.36,0,1),.78,.18);element.style.height=(8+value*90).toFixed(1)+'%';});
    qa('.pc-addon-reactor-core').forEach(function(element){var value=smooth('reactor',clamp(low*.54+level*.24+peak*.22,0,1),.70,.16);element.style.transform='scale('+(0.90+value*.20).toFixed(3)+')';element.style.filter='brightness('+(1+value*.52).toFixed(2)+') saturate('+(1+value*.72).toFixed(2)+')';});
    document.documentElement.style.setProperty('--pc-phase-x',(50+(mid-.5)*22).toFixed(1)+'%');document.documentElement.style.setProperty('--pc-phase-y',(50+(high-low)*18).toFixed(1)+'%');
  }

  function consumeMeterBus(timestamp){
    if(timestamp-state.lastFrame<34){requestAnimationFrame(consumeMeterBus);return;}state.lastFrame=timestamp;
    var bus=window.__MeterBus||{};var level=clamp(bus.level,.02,1);var peak=clamp(bus.peak||level,.02,1);var pulse=clamp(bus.pulse||Math.max(0,peak-level),0,1);
    driveSideLeds(bus,level,peak);drivePanelModules(bus,level,peak,pulse);requestAnimationFrame(consumeMeterBus);
  }

  function normalizeUi(){ensureActionButtons();ensureMainHeader();normalizeDesktopNowPlaying();normalizeMobileNowPlaying();}
  function scheduleNormalize(){if(state.normalizeQueued)return;state.normalizeQueued=true;requestAnimationFrame(function(){state.normalizeQueued=false;normalizeUi();});}
  function boot(){
    installTouchFeedback();normalizeUi();sidePanel('left');sidePanel('right');
    if(!window.__S666_STAGE_BUS_LOOP__){window.__S666_STAGE_BUS_LOOP__=true;requestAnimationFrame(consumeMeterBus);}
  }

  var observer=new MutationObserver(scheduleNormalize);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){boot();observer.observe(document.body,{childList:true,subtree:true,characterData:true});},{once:true});
  else{boot();observer.observe(document.body,{childList:true,subtree:true,characterData:true});}
  window.addEventListener('load',boot,{passive:true});
})();
