/*
 * 666SOUNDsDESIGn Player Stage V2
 * Uses the existing __MeterBus setter. No new analyser and no animation timer.
 */
(function(){
  'use strict';
  if(window.__S666_PLAYER_STAGE_V2__) return;
  window.__S666_PLAYER_STAGE_V2__ = true;

  var LOGIN_URL='https://666-system-auth.666soundsdesign-broadcaster.com/login';
  var state={levels:{},lastLevel:0,lastPeak:0,bus:null};
  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function clamp(v,a,b){v=Number(v)||0;return Math.max(a,Math.min(b,v));}
  function avg(a,f){if(!a||!a.length)return f||0;return a.reduce(function(x,y){return x+(Number(y)||0);},0)/a.length;}
  function smooth(key,target,attack,release){
    var prev=Number(state.levels[key]||0);
    var speed=target>prev?(attack||.68):(release||.20);
    var next=prev+(target-prev)*speed;
    state.levels[key]=next;
    return next;
  }
  function setClass(el,name,on){if(el)el.classList.toggle(name,!!on);}
  function toast(text,mode){
    var el=q('#s666StageToast');
    if(!el){el=document.createElement('div');el.id='s666StageToast';el.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483640;padding:10px 16px;border-radius:12px;border:1px solid rgba(22,255,243,.5);background:rgba(3,7,20,.97);color:#16fff3;font:900 11px/1.3 ui-monospace,monospace;box-shadow:0 0 22px rgba(22,255,243,.18);opacity:0;transition:opacity .18s';document.body.appendChild(el);}
    el.textContent=text;el.style.color=mode==='error'?'#ff78cf':'#16fff3';el.style.opacity='1';clearTimeout(el.__t);el.__t=setTimeout(function(){el.style.opacity='0';},3000);
  }

  function ensureGate(){
    var gate=q('#s666StageGate');if(gate)return gate;
    gate=document.createElement('div');gate.id='s666StageGate';
    gate.innerHTML='<section class="s666-stage-gate-box" role="dialog" aria-modal="true"><h3>PROTECTED PLAYER CONTROL</h3><p id="s666StageGateText">Authentication is required.</p><input id="s666StageGatePassword" type="password" autocomplete="current-password" placeholder="Admin password (only when requested)" hidden><div class="s666-stage-gate-actions"><button type="button" data-stage-close>CANCEL</button><button type="button" id="s666StageGateLogin">AUTH LOGIN</button><button type="button" id="s666StageGateContinue" class="danger" hidden>CONTINUE</button></div></section>';
    document.body.appendChild(gate);
    gate.addEventListener('click',function(ev){if(ev.target===gate||ev.target.closest('[data-stage-close]'))gate.classList.remove('is-open');});
    q('#s666StageGateLogin',gate).onclick=function(){location.href=LOGIN_URL+'?next='+encodeURIComponent(location.href);};
    return gate;
  }
  function openGate(message,needPassword,onContinue){
    var gate=ensureGate();q('#s666StageGateText',gate).textContent=message;
    var input=q('#s666StageGatePassword',gate);input.hidden=!needPassword;if(!needPassword)input.value='';
    var cont=q('#s666StageGateContinue',gate);cont.hidden=!onContinue;cont.onclick=function(){if(onContinue)onContinue(input.value||'');};
    gate.classList.add('is-open');
  }
  function closeGate(){var g=q('#s666StageGate');if(g)g.classList.remove('is-open');}
  async function gateCheck(){
    try{var r=await fetch('/api/admin/gate-check?t='+Date.now(),{credentials:'include',cache:'no-store'});var d=await r.json().catch(function(){return{};});return {ok:r.ok&&d.ok===true&&d.authOk===true&&d.pwOk===true,authOk:d.authOk===true,pwOk:d.pwOk===true,data:d};}
    catch(e){return {ok:false,authOk:false,pwOk:false,error:e};}
  }
  async function protectedDiscord(){
    var gate=await gateCheck();
    if(!gate.authOk){openGate('Authentication Worker login is required before the Discord Shooter opens.',false,null);return;}
    if(!gate.pwOk){openGate('Password Worker access is not active. Complete the protected login first.',false,null);return;}
    if(window.S666DiscordPlayerAddonV3&&typeof window.S666DiscordPlayerAddonV3.messagePost==='function'){
      window.S666DiscordPlayerAddonV3.messagePost();
    }else if(window.FPAdminOverlay&&typeof window.FPAdminOverlay.open==='function'){
      window.FPAdminOverlay.open();
    }else toast('Discord Shooter is not ready.','error');
  }
  async function executeSkip(password){
    var headers={'content-type':'application/json'};if(password)headers['x-admin-password']=password;
    try{
      var r=await fetch('/api/admin/skip',{method:'POST',headers:headers,credentials:'include',body:JSON.stringify({source:'player-stage-v2'}),cache:'no-store'});
      var d=await r.json().catch(function(){return{};});
      if(!r.ok||d.ok!==true)throw new Error(d.error||'skip_failed');
      closeGate();toast('AUTO-DJ SKIP ausgeführt.');
    }catch(e){toast(e.message==='cooldown_active'?'Skip-Cooldown aktiv.':'Auto-DJ Skip abgelehnt.','error');}
  }
  async function protectedSkip(){
    var gate=await gateCheck();
    if(!gate.authOk){openGate('Authentication Worker login is required for Auto-DJ Skip.',false,null);return;}
    if(gate.ok){if(confirm('Aktuellen Auto-DJ-Titel wirklich überspringen?'))executeSkip('');return;}
    openGate('Password Worker confirmation is required for Auto-DJ Skip.',true,function(pw){if(!pw){toast('Admin-Passwort fehlt.','error');return;}executeSkip(pw);});
  }

  function button(id,label,action){var b=document.createElement('button');b.id=id;b.type='button';b.textContent=label;b.setAttribute('data-action',action);return b;}
  function ensureAdminActions(){
    var shell=q('.player-shell');
    if(shell){
      var dock=q('.s666-primary-action-dock',shell),bottom=q('.bottom-console',shell),meter=q('#pcBottomSyncMeter',shell);
      var rack=q('#s666ControlRack',shell);
      if(!rack&&bottom){rack=document.createElement('section');rack.id='s666ControlRack';rack.setAttribute('aria-label','Player controls and protected radio actions');shell.insertBefore(rack,meter||bottom);}
      if(rack){
        if(dock&&dock.parentNode!==rack)rack.appendChild(dock);
        if(bottom&&bottom.parentNode!==rack)rack.appendChild(bottom);
        var realEq=q('#pcRealEqPanel');if(realEq&&realEq.parentNode!==rack)rack.appendChild(realEq);
        var row=q('#s666StageAdminActions',rack);
        if(!row){row=document.createElement('div');row.id='s666StageAdminActions';row.appendChild(button('s666StageDiscord','DISCORD SHOOTER','discord'));row.appendChild(button('s666StageSkip','AUTO-DJ SKIP','skip'));rack.appendChild(row);}
        var db=q('#s666StageDiscord',row);if(db&&!db.__bound){db.__bound=true;db.onclick=protectedDiscord;}
        var sb=q('#s666StageSkip',row);if(sb&&!sb.__bound){sb.__bound=true;sb.onclick=protectedSkip;}
      }
    }
    var mobileSlot=q('#mffApp .mff-discord-slot');
    if(mobileSlot&&!q('#s666StageMobileActions',mobileSlot)){
      var mr=document.createElement('div');mr.id='s666StageMobileActions';
      var md=button('s666StageMobileDiscord','DISCORD','discord'),ms=button('s666StageMobileSkip','AUTO-DJ SKIP','skip');
      md.onclick=protectedDiscord;ms.onclick=protectedSkip;mr.appendChild(md);mr.appendChild(ms);mobileSlot.appendChild(mr);
    }
  }

  function sidePanel(side){
    var tower=q(side==='left'?'#pcLeftFxAddon .pc-addon-tower':'#pcRightFxAddon .pc-addon-tower');if(!tower)return false;
    var id=side==='left'?'s666LeftStatusPanel':'s666RightStatusPanel';if(q('#'+id,tower))return true;
    var panel=document.createElement('section');panel.id=id;panel.className='s666-side-status-panel';panel.setAttribute('data-side',side);
    var labels=side==='left'?['INPUT','RMS','PEAK','BUS']:['MAIN','BACK','META','SYNC'];
    panel.innerHTML='<div class="s666-side-status-title"><span>'+(side==='left'?'SIGNAL CORE':'ROUTE CORE')+'</span><b>LIVE</b></div><div class="s666-side-status-grid">'+labels.map(function(x){return'<span class="s666-side-led" data-led="'+x.toLowerCase()+'"><i></i><b>'+x+'</b></span>';}).join('')+'</div>';
    tower.appendChild(panel);return true;
  }
  function ensureLayout(){ensureAdminActions();sidePanel('left');sidePanel('right');}

  function driveSideLeds(bus,level,peak){
    var age=bus&&bus.ts?Date.now()-bus.ts:99999,live=age<700&&bus&&bus.source!=='synthetic';
    function led(panel,key,on,cls){var el=q('#'+panel+' [data-led="'+key+'"]');if(!el)return;el.classList.remove('is-on','is-peak','is-back','is-warn');if(on)el.classList.add(cls||'is-on');}
    led('s666LeftStatusPanel','input',!!bus&&age<700);
    led('s666LeftStatusPanel','rms',level>.09);
    led('s666LeftStatusPanel','peak',peak>.62,'is-peak');
    led('s666LeftStatusPanel','bus',live);
    var src=q('#statusSource');var back=!!(src&&(src.classList.contains('state-backup')||src.classList.contains('state-fallback')));
    led('s666RightStatusPanel','main',!back&&live);
    led('s666RightStatusPanel','back',back,'is-back');
    var meta=q('#statusMeta');led('s666RightStatusPanel','meta',!!(meta&&(meta.classList.contains('state-api')||meta.classList.contains('is-active'))));
    led('s666RightStatusPanel','sync',live&&level>.04);
  }
  function setSideMeters(values,selector,prefix){
    qa(selector).forEach(function(el,i){var target=clamp(values[i%values.length],.02,1),v=smooth(prefix+i,target,.72,.18);el.style.height=(8+v*90).toFixed(1)+'%';el.style.opacity=(.36+v*.64).toFixed(2);el.style.filter='brightness('+(1+v*.68).toFixed(2)+') saturate('+(1+v*.78).toFixed(2)+')';});
  }
  function setBottom(level,peak,pulse){
    var bars=qa('#pcBottomSyncMeter .pc-bottom-sync-seg');if(!bars.length)return;
    var active=clamp(level*.72+peak*.28,0,1),center=(bars.length-1)/2,width=Math.max(2,active*center);
    bars.forEach(function(el,i){var dist=Math.abs(i-center),local=clamp(1-dist/Math.max(1,width),0,1),target=dist<=width?clamp(.24+local*.54+pulse*.22,0,1):.06,v=smooth('bottom'+i,target,.80,.24);el.classList.toggle('is-on',dist<=width);el.style.opacity=(.12+v*.88).toFixed(2);el.style.transform='scaleY('+(0.35+v*.75).toFixed(3)+')';el.style.filter='brightness('+(1+v*.82).toFixed(2)+') saturate('+(1+v*.65).toFixed(2)+')';});
  }
  function setEq(bus,level,peak){
    var eq=(bus&&Array.isArray(bus.eq)&&bus.eq.length)?bus.eq:[level,peak,level*.8,peak*.7];
    var pc=qa('#eqBars .eq-bar-fill,.visualizer .eq-bars .eq-bar-fill');
    pc.forEach(function(el,i){var raw=clamp(eq[Math.round(i/Math.max(1,pc.length-1)*(eq.length-1))]||0,0,1),v=smooth('eqpc'+i,raw,.78,.17);el.style.height=(10+v*90).toFixed(1)+'%';el.style.opacity=(.42+v*.58).toFixed(2);el.style.filter='brightness('+(1+v*.75).toFixed(2)+') saturate('+(1+v*.92).toFixed(2)+')';});
    var mob=qa('#mffEqBars i');mob.forEach(function(el,i){var raw=clamp(eq[Math.round(i/Math.max(1,mob.length-1)*(eq.length-1))]||0,0,1),v=smooth('eqmob'+i,raw,.80,.18);el.style.height=(14+v*150).toFixed(1)+'px';el.style.opacity=(.35+v*.65).toFixed(2);el.style.filter='brightness('+(1+v*.72).toFixed(2)+') saturate('+(1+v*.85).toFixed(2)+')';});
  }
  function setPanelModules(bus,level,peak,pulse){
    var eq=(bus&&bus.eq)||[],low=avg(eq.slice(0,Math.max(1,Math.floor(eq.length*.34))),level),mid=avg(eq.slice(Math.floor(eq.length*.28),Math.max(2,Math.floor(eq.length*.70))),level),high=avg(eq.slice(Math.floor(eq.length*.62)),level);
    document.documentElement.style.setProperty('--s666-stage-level',level.toFixed(3));document.documentElement.style.setProperty('--s666-stage-peak',peak.toFixed(3));
    qa('.pc-addon-waveform i').forEach(function(el,i){var source=i%3===0?low:i%3===1?mid:high,v=smooth('wave'+i,clamp(source*.78+pulse*.22,0,1),.82,.20);el.style.height=(12+v*86).toFixed(1)+'%';el.style.opacity=(.35+v*.65).toFixed(2);el.style.filter='brightness('+(1+v*.70).toFixed(2)+')';});
    qa('.pc-addon-beatline i').forEach(function(el,i){var v=smooth('beat'+i,clamp(pulse*(.72+(i%2)*.28)+peak*.16,0,1),.92,.12);el.style.height=(10+v*88).toFixed(1)+'%';el.style.opacity=(.28+v*.72).toFixed(2);});
    qa('.pc-addon-vu-grid .pc-vu-channel:first-child i').forEach(function(el,i){var v=smooth('vuL'+i,clamp((i?mid:low)*.65+level*.35,0,1),.82,.17);el.style.height=(8+v*90).toFixed(1)+'%';el.style.opacity=(.30+v*.70).toFixed(2);});
    qa('.pc-addon-vu-grid .pc-vu-channel:last-child i').forEach(function(el,i){var v=smooth('vuR'+i,clamp((i?high:mid)*.65+peak*.35,0,1),.82,.17);el.style.height=(8+v*90).toFixed(1)+'%';el.style.opacity=(.30+v*.70).toFixed(2);});
    qa('.pc-addon-reactor-core').forEach(function(el){var s=smooth('reactor',clamp(low*.55+level*.25+peak*.20,0,1),.78,.16);el.style.transform='scale('+(0.86+s*.28).toFixed(3)+')';el.style.filter='brightness('+(1+s*.55).toFixed(2)+') saturate('+(1+s*.75).toFixed(2)+') drop-shadow(0 0 '+(8+s*28).toFixed(1)+'px rgba(22,255,243,.35))';});
    qa('.phase-line').forEach(function(el){var s=smooth('phaseLine',clamp(mid*.58+high*.24+pulse*.18,0,1),.80,.18);el.style.transform='rotate('+(-55+s*110).toFixed(1)+'deg) scaleX('+(0.56+s*.72).toFixed(3)+')';el.style.opacity=(.34+s*.64).toFixed(2);});
  }
  function drive(bus){
    if(!bus||typeof bus!=='object')return;
    state.bus=bus;
    var level=smooth('masterLevel',clamp(bus.level,0,1),.76,.16),peak=smooth('masterPeak',clamp(bus.peak==null?bus.level:bus.peak,0,1),.90,.12),pulse=clamp(Math.max(0,peak-state.lastPeak)*2.4+Math.abs(level-state.lastLevel)*4.2,0,1);
    state.lastLevel=level;state.lastPeak=peak;
    var eq=Array.isArray(bus.eq)?bus.eq:[],low=avg(eq.slice(0,Math.max(1,Math.floor(eq.length*.35))),level),mid=avg(eq.slice(Math.floor(eq.length*.28),Math.max(2,Math.floor(eq.length*.72))),level),high=avg(eq.slice(Math.floor(eq.length*.62)),level);
    setSideMeters([clamp(level*.58+low*.42,0,1),clamp(level*.54+mid*.46,0,1),clamp(level*.46+pulse*.54,0,1)],'#leftMeterA,#leftMeterB,#leftMeterC','left');
    setSideMeters([clamp(level*.55+high*.45,0,1),clamp(level*.52+mid*.48,0,1),clamp(level*.44+peak*.56,0,1)],'#rightMeterA,#rightMeterB,#rightMeterC','right');
    setBottom(level,peak,pulse);setEq(bus,level,peak);setPanelModules(bus,level,peak,pulse);driveSideLeds(bus,level,peak);
  }
  function installMeterBusHook(){
    var initial=window.__MeterBus;
    try{
      Object.defineProperty(window,'__MeterBus',{configurable:true,enumerable:true,get:function(){return state.bus;},set:function(v){state.bus=v;drive(v);}});
      if(initial){state.bus=initial;drive(initial);}
    }catch(e){state.bus=initial;}
  }
  function boot(){ensureLayout();installMeterBusHook();
    var mo=new MutationObserver(function(){ensureLayout();if(q('#s666ControlRack')&&q('#s666LeftStatusPanel')&&q('#s666RightStatusPanel')&&(!q('#mffApp')||q('#s666StageMobileActions')))setTimeout(function(){mo.disconnect();},1200);});
    mo.observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('load',ensureLayout,{once:true});
})();
