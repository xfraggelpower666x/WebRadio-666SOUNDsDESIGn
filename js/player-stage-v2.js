/*
 * 666SOUNDsDESIGn Player Stage V8
 * Zuständigkeit: Touchfeedback, geschützte Aktionsbuttons, Ticker und Status-LEDs.
 * Der Audio-Visualizer bleibt alleiniger Writer für EQ, Seitenmeter und Bottom-Meter.
 */
(function(){
  'use strict';
  if(window.__S666_PLAYER_STAGE_V2_CORRECTION__) return;
  window.__S666_PLAYER_STAGE_V2_CORRECTION__ = true;

  var state={bus:null,lastDrive:0};
  function q(selector,root){return (root||document).querySelector(selector);}
  function qa(selector,root){return Array.from((root||document).querySelectorAll(selector));}
  function clamp(value,min,max){value=Number(value)||0;return Math.max(min,Math.min(max,value));}

  function toast(message,type){
    var host=q('#actionText')||q('#actionStatus')||q('[role="status"]');
    if(host) host.textContent=String(message||'');
    try{window.dispatchEvent(new CustomEvent('s666:player-toast',{detail:{message:String(message||''),type:type||'info'}}));}catch(_){ }
  }

  async function openDiscordShooter(){
    try{
      if(!window.S666DiscordPlayerAddonV3||typeof window.S666DiscordPlayerAddonV3.messagePost!=='function') throw new Error('Discord Shooter ist nicht bereit.');
      await window.S666DiscordPlayerAddonV3.messagePost();
      toast('Discord Shooter geöffnet.');
    }catch(error){toast(error&&error.message?error.message:'Discord Shooter ist nicht bereit.','error');}
  }

  async function requestSkip(){
    if(!confirm('Aktuellen Auto-DJ-Titel wirklich überspringen?')) return false;
    if(!window.S666SkipControl||typeof window.S666SkipControl.skip!=='function'){
      toast('Auto-DJ Skip ist nicht bereit.','error');
      return false;
    }
    var result=await window.S666SkipControl.skip({source:'player-stage-v2',prompt:'Admin-Passwort für Auto-DJ Skip eingeben:'});
    if(result&&result.ok) toast('AUTO-DJ SKIP ausgeführt.');
    else toast(result&&result.error?result.error:'Auto-DJ Skip abgelehnt.','error');
    return !!(result&&result.ok);
  }

  function installTouchFeedback(){
    if(document.documentElement.dataset.s666StageTouchFeedback==='1') return;
    document.documentElement.dataset.s666StageTouchFeedback='1';
    var selector='#mffApp button,#mffApp a[href],.player-shell button,.player-shell a[href],.player-shell [role="button"]';
    var pressed=null,releaseTimer=0;
    function release(delay){
      clearTimeout(releaseTimer);
      var current=pressed;
      releaseTimer=setTimeout(function(){
        if(!current) return;
        current.classList.remove('is-pressed');
        current.removeAttribute('data-s666-press');
        if(pressed===current) pressed=null;
      },delay||0);
    }
    function press(target,input){
      var control=target&&target.closest?target.closest(selector):null;
      if(!control||control.disabled||control.getAttribute('aria-disabled')==='true') return;
      if(pressed&&pressed!==control) release(0);
      pressed=control;
      clearTimeout(releaseTimer);
      control.classList.add('is-pressed');
      control.setAttribute('data-s666-press','1');
      try{window.dispatchEvent(new CustomEvent('s666:button-feedback',{detail:{id:control.id||'',action:control.getAttribute('data-action')||String(control.textContent||'').trim().slice(0,40),input:input||'pointer'}}));}catch(_){ }
    }
    document.addEventListener('pointerdown',function(event){press(event.target,event.pointerType||'pointer');},{capture:true,passive:true});
    document.addEventListener('pointerup',function(){release(150);},{capture:true,passive:true});
    document.addEventListener('pointercancel',function(){release(0);},{capture:true,passive:true});
    document.addEventListener('touchend',function(){release(170);},{capture:true,passive:true});
    document.addEventListener('touchcancel',function(){release(0);},{capture:true,passive:true});
    document.addEventListener('keydown',function(event){if(event.key==='Enter'||event.key===' ') press(event.target,'keyboard');},true);
    document.addEventListener('keyup',function(event){if(event.key==='Enter'||event.key===' ') release(120);},true);
    window.addEventListener('blur',function(){release(0);},{passive:true});
  }

  function makeButton(id,label,action){
    var button=document.createElement('button');
    button.id=id;
    button.type='button';
    button.textContent=label;
    button.setAttribute('data-action',action);
    return button;
  }

  function ensureActionButtons(){
    var toolbar=q('.player-shell .bottom-console .control-toolbar');
    if(toolbar){
      var discord=q('#s666StageDiscord',toolbar);
      if(!discord){discord=makeButton('s666StageDiscord','DISCORD SHOOTER','discord');toolbar.appendChild(discord);}
      if(!discord.__bound){discord.__bound=true;discord.onclick=openDiscordShooter;}
      var skip=q('#s666StageSkip',toolbar);
      if(!skip){skip=makeButton('s666StageSkip','AUTO-DJ SKIP','skip');toolbar.appendChild(skip);}
      if(!skip.__bound){skip.__bound=true;skip.onclick=requestSkip;}
    }

    var mobileSlot=q('#mffApp .mff-discord-slot');
    if(mobileSlot&&!q('#s666StageMobileActions',mobileSlot)){
      var row=document.createElement('div');
      row.id='s666StageMobileActions';
      var mobileDiscord=makeButton('s666StageMobileDiscord','DISCORD','discord');
      var mobileSkip=makeButton('s666StageMobileSkip','AUTO-DJ SKIP','skip');
      mobileDiscord.onclick=openDiscordShooter;
      mobileSkip.onclick=requestSkip;
      row.appendChild(mobileDiscord);
      row.appendChild(mobileSkip);
      mobileSlot.appendChild(row);
    }
  }

  function ensureSidePanel(side){
    var tower=q(side==='left'?'#pcLeftFxAddon .pc-addon-tower':'#pcRightFxAddon .pc-addon-tower');
    if(!tower) return false;
    var id=side==='left'?'s666LeftStatusPanel':'s666RightStatusPanel';
    if(q('#'+id,tower)) return true;
    var labels=side==='left'?['INPUT','RMS','PEAK','BUS']:['MAIN','BACK','META','SYNC'];
    var panel=document.createElement('section');
    panel.id=id;
    panel.className='s666-side-status-panel';
    panel.setAttribute('data-side',side);
    panel.innerHTML='<div class="s666-side-status-title"><span>'+(side==='left'?'SIGNAL CORE':'ROUTE CORE')+'</span><b>LIVE</b></div><div class="s666-side-status-grid">'+labels.map(function(label){return '<span class="s666-side-led" data-led="'+label.toLowerCase()+'"><i></i><b>'+label+'</b></span>';}).join('')+'</div>';
    tower.appendChild(panel);
    return true;
  }

  function setLed(panel,key,on,className){
    var element=q('#'+panel+' [data-led="'+key+'"]');
    if(!element) return;
    element.classList.remove('is-on','is-peak','is-back','is-warn');
    if(on) element.classList.add(className||'is-on');
  }

  function driveSideLeds(bus){
    if(!bus||typeof bus!=='object') return;
    var age=bus.ts?Date.now()-bus.ts:99999;
    var level=clamp(bus.level,0,1);
    var peak=clamp(bus.peak==null?level:bus.peak,0,1);
    var live=age<900&&bus.source!=='synthetic';
    setLed('s666LeftStatusPanel','input',age<900);
    setLed('s666LeftStatusPanel','rms',level>.06);
    setLed('s666LeftStatusPanel','peak',peak>.56,'is-peak');
    setLed('s666LeftStatusPanel','bus',live);
    var source=q('#statusSource');
    var backup=!!(source&&(source.classList.contains('state-backup')||source.classList.contains('state-fallback')));
    setLed('s666RightStatusPanel','main',!backup&&live);
    setLed('s666RightStatusPanel','back',backup,'is-back');
    var meta=q('#statusMeta');
    setLed('s666RightStatusPanel','meta',!!(meta&&(meta.classList.contains('state-api')||meta.classList.contains('is-active'))));
    setLed('s666RightStatusPanel','sync',live&&level>.03);
    document.documentElement.style.setProperty('--s666-stage-level',level.toFixed(3));
    document.documentElement.style.setProperty('--s666-stage-peak',peak.toFixed(3));
  }

  function drive(bus){
    if(!bus||typeof bus!=='object') return;
    state.bus=bus;
    var now=Date.now();
    if(now-state.lastDrive<28) return;
    state.lastDrive=now;
    driveSideLeds(bus);
  }

  function installMeterBusHook(){
    var initial=window.__MeterBus;
    try{
      Object.defineProperty(window,'__MeterBus',{
        configurable:true,
        enumerable:true,
        get:function(){return state.bus;},
        set:function(value){state.bus=value;drive(value);}
      });
      if(initial){state.bus=initial;drive(initial);}
    }catch(_){state.bus=initial;}
  }

  var ticker={observer:null,timer:0,animation:null};
  function tickerText(){
    var element=q('#nowPlayingTicker');
    var meta=q('#metaLine');
    if(!element) return '';
    var text=String(element.textContent||'').replace(/\s+/g,' ').trim();
    var metaText=String(meta&&meta.textContent||'').replace(/\s+/g,' ').trim();
    if((!text||text==='—'||text==='-')&&metaText){text=metaText;element.textContent=text;}
    if(!text){text='666SOUNDsDESIGn WebRadio • LIVE';element.textContent=text;}
    return text;
  }

  function restartTicker(){
    var element=q('#nowPlayingTicker');
    var box=element&&element.closest('.ticker-window');
    if(!element||!box) return;
    tickerText();
    if(ticker.animation){try{ticker.animation.cancel();}catch(_){ }ticker.animation=null;}
    element.style.animation='none';
    element.style.transform='translateX(0px)';
    requestAnimationFrame(function(){
      var boxWidth=Math.max(1,box.clientWidth);
      var textWidth=Math.max(1,element.scrollWidth);
      var duration=Math.max(12000,Math.min(32000,(boxWidth+textWidth)*27));
      if(typeof element.animate==='function'){
        ticker.animation=element.animate(
          [{transform:'translateX('+boxWidth+'px)'},{transform:'translateX(-'+textWidth+'px)'}],
          {duration:duration,iterations:Infinity,easing:'linear'}
        );
      }
    });
  }

  function installTicker(){
    var element=q('#nowPlayingTicker');
    var meta=q('#metaLine');
    if(!element) return;
    tickerText();
    restartTicker();
    if(!ticker.observer&&typeof MutationObserver!=='undefined'){
      ticker.observer=new MutationObserver(function(){clearTimeout(ticker.timer);ticker.timer=setTimeout(restartTicker,40);});
      ticker.observer.observe(element,{childList:true,characterData:true,subtree:true});
      if(meta) ticker.observer.observe(meta,{childList:true,characterData:true,subtree:true});
    }
    if(!window.__S666_TICKER_V8_RESIZE__){
      window.__S666_TICKER_V8_RESIZE__=true;
      window.addEventListener('resize',function(){clearTimeout(ticker.timer);ticker.timer=setTimeout(restartTicker,120);},{passive:true});
    }
  }

  function ensure(){
    installTouchFeedback();
    ensureActionButtons();
    ensureSidePanel('left');
    ensureSidePanel('right');
  }

  function boot(){
    ensure();
    installTicker();
    installMeterBusHook();
    var attempts=0;
    var timer=setInterval(function(){
      ensure();
      if(attempts===1||attempts===5) restartTicker();
      attempts+=1;
      if(attempts>12) clearInterval(timer);
    },500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
