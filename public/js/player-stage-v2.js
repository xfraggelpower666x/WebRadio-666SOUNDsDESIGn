/*
 * 666SOUNDsDESIGn Player Stage V2 Correction
 * No element reparenting. Existing layout stays intact.
 * Adds only protected action buttons, side LEDs and MeterBus visual calibration.
 */
(function(){
  'use strict';
  if(window.__S666_PLAYER_STAGE_V2_CORRECTION__) return;
  window.__S666_PLAYER_STAGE_V2_CORRECTION__ = true;

  var TOKEN_KEY='s666_admin_session_token_v1';
  var state={levels:{},lastLevel:0,lastPeak:0,bus:null,pending:null};

  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function clamp(v,a,b){v=Number(v)||0;return Math.max(a,Math.min(b,v));}
  function avg(a,f){if(!a||!a.length)return f||0;return a.reduce(function(x,y){return x+(Number(y)||0);},0)/a.length;}
  function smooth(key,target,attack,release){
    var prev=Number(state.levels[key]||0);
    var speed=target>prev?(attack||.72):(release||.18);
    var next=prev+(target-prev)*speed;
    state.levels[key]=next;
    return next;
  }
  function getToken(){try{return sessionStorage.getItem(TOKEN_KEY)||'';}catch(e){return '';}}
  function setToken(v){try{if(v)sessionStorage.setItem(TOKEN_KEY,v);else sessionStorage.removeItem(TOKEN_KEY);}catch(e){}}
  function authHeaders(extra){
    var h=Object.assign({},extra||{}),t=getToken();
    if(t)h.Authorization='Bearer '+t;
    return h;
  }
  function toast(text,mode){
    var el=q('#s666StageToast');
    if(!el){
      el=document.createElement('div');
      el.id='s666StageToast';
      el.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483640;padding:10px 16px;border-radius:12px;border:1px solid rgba(22,255,243,.5);background:rgba(3,7,20,.97);color:#16fff3;font:900 11px/1.3 ui-monospace,monospace;box-shadow:0 0 22px rgba(22,255,243,.18);opacity:0;transition:opacity .18s';
      document.body.appendChild(el);
    }
    el.textContent=text;
    el.style.color=mode==='error'?'#ff78cf':'#16fff3';
    el.style.opacity='1';
    clearTimeout(el.__t);
    el.__t=setTimeout(function(){el.style.opacity='0';},3000);
  }

  function ensureGate(){
    var gate=q('#s666StageGate');
    if(gate)return gate;
    gate=document.createElement('div');
    gate.id='s666StageGate';
    gate.innerHTML='<section class="s666-stage-gate-box" role="dialog" aria-modal="true"><h3>PROTECTED PLAYER CONTROL</h3><p id="s666StageGateText">Admin password required.</p><input id="s666StageGatePassword" type="password" autocomplete="current-password" placeholder="Admin password"><div class="s666-stage-gate-actions"><button type="button" data-stage-close>CANCEL</button><button type="button" id="s666StageGateLogin" class="danger">LOGIN & CONTINUE</button></div></section>';
    document.body.appendChild(gate);
    gate.addEventListener('click',function(ev){
      if(ev.target===gate||ev.target.closest('[data-stage-close]')) closeGate();
    });
    q('#s666StageGatePassword',gate).addEventListener('keydown',function(ev){
      if(ev.key==='Enter') loginAndContinue();
    });
    q('#s666StageGateLogin',gate).onclick=loginAndContinue;
    return gate;
  }

  function openGate(message,pending){
    state.pending=pending||null;
    var gate=ensureGate();
    q('#s666StageGateText',gate).textContent=message||'Admin password required.';
    var input=q('#s666StageGatePassword',gate);
    input.value='';
    gate.classList.add('is-open');
    setTimeout(function(){try{input.focus();}catch(e){}},40);
  }

  function closeGate(){
    var gate=q('#s666StageGate');
    if(gate)gate.classList.remove('is-open');
    state.pending=null;
  }

  async function loginAndContinue(){
    var gate=ensureGate(),input=q('#s666StageGatePassword',gate),password=String(input.value||'');
    if(!password){toast('Admin-Passwort fehlt.','error');return;}
    var btn=q('#s666StageGateLogin',gate);
    btn.disabled=true;
    btn.textContent='LOGIN...';
    try{
      var r=await fetch('/api/admin/login',{
        method:'POST',
        headers:{'content-type':'application/json'},
        credentials:'include',
        cache:'no-store',
        body:JSON.stringify({password:password})
      });
      var d=await r.json().catch(function(){return{};});
      if(!r.ok||d.ok!==true||!d.token)throw new Error(d.error||'login_failed');
      setToken(d.token);
      var pending=state.pending;
      closeGate();
      toast('Admin-Zugang aktiv.');
      if(typeof pending==='function')await pending();
    }catch(e){
      setToken('');
      toast('Login abgelehnt.','error');
    }finally{
      btn.disabled=false;
      btn.textContent='LOGIN & CONTINUE';
    }
  }

  async function gateCheck(){
    var token=getToken();
    if(!token)return {ok:false,authOk:false,pwOk:false};
    try{
      var r=await fetch('/api/admin/gate-check?t='+Date.now(),{
        credentials:'include',
        cache:'no-store',
        headers:authHeaders({'accept':'application/json'})
      });
      var d=await r.json().catch(function(){return{};});
      if(!r.ok||d.ok!==true){
        if(r.status===401||r.status===403)setToken('');
        return {ok:false,authOk:d.authOk===true,pwOk:d.pwOk===true,data:d};
      }
      return {ok:true,authOk:true,pwOk:true,data:d};
    }catch(e){
      return {ok:false,authOk:false,pwOk:false,error:e};
    }
  }

  async function withGate(action,message){
    var gate=await gateCheck();
    if(gate.ok)return action();
    openGate(message||'Admin password required.',action);
  }

  async function protectedDiscord(){
    return withGate(function(){
      if(window.S666DiscordPlayerAddonV3&&typeof window.S666DiscordPlayerAddonV3.messagePost==='function'){
        window.S666DiscordPlayerAddonV3.messagePost();
      }else if(window.FPAdminOverlay&&typeof window.FPAdminOverlay.open==='function'){
        window.FPAdminOverlay.open();
      }else{
        toast('Discord Shooter ist nicht bereit.','error');
      }
    },'Admin-Passwort für den Discord Shooter eingeben.');
  }

  async function protectedSkip(){
    return withGate(async function(){
      if(!confirm('Aktuellen Auto-DJ-Titel wirklich überspringen?'))return;
      try{
        var r=await fetch('/api/admin/skip',{
          method:'POST',
          headers:authHeaders({'content-type':'application/json'}),
          credentials:'include',
          body:JSON.stringify({source:'player-stage-v2-correction'}),
          cache:'no-store'
        });
        var d=await r.json().catch(function(){return{};});
        if(!r.ok||d.ok!==true)throw new Error(d.error||'skip_failed');
        toast('AUTO-DJ SKIP ausgeführt.');
      }catch(e){
        toast(e.message==='cooldown_active'?'Skip-Cooldown aktiv.':'Auto-DJ Skip abgelehnt.','error');
      }
    },'Admin-Passwort für Auto-DJ Skip eingeben.');
  }

  function makeButton(id,label,action){
    var b=document.createElement('button');
    b.id=id;
    b.type='button';
    b.textContent=label;
    b.setAttribute('data-action',action);
    return b;
  }

  function ensureActionButtons(){
    var toolbar=q('.player-shell .bottom-console .control-toolbar');
    if(toolbar){
      var d=q('#s666StageDiscord',toolbar);
      if(!d){d=makeButton('s666StageDiscord','DISCORD SHOOTER','discord');toolbar.appendChild(d);}
      if(!d.__bound){d.__bound=true;d.onclick=protectedDiscord;}
      var s=q('#s666StageSkip',toolbar);
      if(!s){s=makeButton('s666StageSkip','AUTO-DJ SKIP','skip');toolbar.appendChild(s);}
      if(!s.__bound){s.__bound=true;s.onclick=protectedSkip;}
    }

    var mobileSlot=q('#mffApp .mff-discord-slot');
    if(mobileSlot&&!q('#s666StageMobileActions',mobileSlot)){
      var row=document.createElement('div');
      row.id='s666StageMobileActions';
      var md=makeButton('s666StageMobileDiscord','DISCORD','discord');
      var ms=makeButton('s666StageMobileSkip','AUTO-DJ SKIP','skip');
      md.onclick=protectedDiscord;
      ms.onclick=protectedSkip;
      row.appendChild(md);
      row.appendChild(ms);
      mobileSlot.appendChild(row);
    }
  }

  function sidePanel(side){
    var tower=q(side==='left'?'#pcLeftFxAddon .pc-addon-tower':'#pcRightFxAddon .pc-addon-tower');
    if(!tower)return false;
    var id=side==='left'?'s666LeftStatusPanel':'s666RightStatusPanel';
    if(q('#'+id,tower))return true;
    var panel=document.createElement('section');
    panel.id=id;
    panel.className='s666-side-status-panel';
    panel.setAttribute('data-side',side);
    var labels=side==='left'?['INPUT','RMS','PEAK','BUS']:['MAIN','BACK','META','SYNC'];
    panel.innerHTML='<div class="s666-side-status-title"><span>'+(side==='left'?'SIGNAL CORE':'ROUTE CORE')+'</span><b>LIVE</b></div><div class="s666-side-status-grid">'+labels.map(function(x){return'<span class="s666-side-led" data-led="'+x.toLowerCase()+'"><i></i><b>'+x+'</b></span>';}).join('')+'</div>';
    tower.appendChild(panel);
    return true;
  }

  function ensureSmallAdditions(){
    ensureActionButtons();
    sidePanel('left');
    sidePanel('right');
  }

  function driveSideLeds(bus,level,peak){
    var age=bus&&bus.ts?Date.now()-bus.ts:99999;
    var live=age<900&&bus&&bus.source!=='synthetic';
    function led(panel,key,on,cls){
      var el=q('#'+panel+' [data-led="'+key+'"]');
      if(!el)return;
      el.classList.remove('is-on','is-peak','is-back','is-warn');
      if(on)el.classList.add(cls||'is-on');
    }
    led('s666LeftStatusPanel','input',!!bus&&age<900);
    led('s666LeftStatusPanel','rms',level>.07);
    led('s666LeftStatusPanel','peak',peak>.58,'is-peak');
    led('s666LeftStatusPanel','bus',live);
    var src=q('#statusSource');
    var back=!!(src&&(src.classList.contains('state-backup')||src.classList.contains('state-fallback')));
    led('s666RightStatusPanel','main',!back&&live);
    led('s666RightStatusPanel','back',back,'is-back');
    var meta=q('#statusMeta');
    led('s666RightStatusPanel','meta',!!(meta&&(meta.classList.contains('state-api')||meta.classList.contains('is-active'))));
    led('s666RightStatusPanel','sync',live&&level>.035);
  }

  function setSideMeters(values,selector,prefix){
    qa(selector).forEach(function(el,i){
      var target=clamp(values[i%values.length],.02,1);
      var v=smooth(prefix+i,target,.80,.16);
      el.style.height=(7+v*92).toFixed(1)+'%';
      el.style.opacity=(.32+v*.68).toFixed(2);
      el.style.filter='brightness('+(1+v*.78).toFixed(2)+') saturate('+(1+v*.92).toFixed(2)+')';
    });
  }

  function setBottom(level,peak,pulse){
    var bars=qa('#pcBottomSyncMeter .pc-bottom-sync-seg');
    if(!bars.length)return;
    var active=clamp(level*.66+peak*.34,0,1);
    var center=(bars.length-1)/2;
    var width=Math.max(2,active*center);
    bars.forEach(function(el,i){
      var dist=Math.abs(i-center);
      var local=clamp(1-dist/Math.max(1,width),0,1);
      var target=dist<=width?clamp(.22+local*.56+pulse*.28,0,1):.04;
      var v=smooth('bottom'+i,target,.88,.20);
      el.classList.toggle('is-on',dist<=width);
      el.style.opacity=(.10+v*.90).toFixed(2);
      el.style.transform='scaleY('+(0.30+v*.82).toFixed(3)+')';
      el.style.filter='brightness('+(1+v*.94).toFixed(2)+') saturate('+(1+v*.78).toFixed(2)+')';
    });
  }

  function setEq(bus,level,peak){
    var eq=(bus&&Array.isArray(bus.eq)&&bus.eq.length)?bus.eq:[level,peak,level*.8,peak*.7];
    var pc=qa('#eqBars .eq-bar-fill,.visualizer .eq-bars .eq-bar-fill');
    pc.forEach(function(el,i){
      var raw=clamp(eq[Math.round(i/Math.max(1,pc.length-1)*(eq.length-1))]||0,0,1);
      var v=smooth('eqpc'+i,raw,.86,.15);
      el.style.height=(8+v*92).toFixed(1)+'%';
      el.style.opacity=(.36+v*.64).toFixed(2);
      el.style.filter='brightness('+(1+v*.90).toFixed(2)+') saturate('+(1+v*1.05).toFixed(2)+')';
    });
    var mob=qa('#mffEqBars i');
    mob.forEach(function(el,i){
      var raw=clamp(eq[Math.round(i/Math.max(1,mob.length-1)*(eq.length-1))]||0,0,1);
      var v=smooth('eqmob'+i,raw,.86,.16);
      el.style.height=(12+v*150).toFixed(1)+'px';
      el.style.opacity=(.32+v*.68).toFixed(2);
      el.style.filter='brightness('+(1+v*.84).toFixed(2)+') saturate('+(1+v*.95).toFixed(2)+')';
    });
  }

  function setPanelModules(bus,level,peak,pulse){
    var eq=(bus&&bus.eq)||[];
    var low=avg(eq.slice(0,Math.max(1,Math.floor(eq.length*.34))),level);
    var mid=avg(eq.slice(Math.floor(eq.length*.28),Math.max(2,Math.floor(eq.length*.70))),level);
    var high=avg(eq.slice(Math.floor(eq.length*.62)),level);
    document.documentElement.style.setProperty('--s666-stage-level',level.toFixed(3));
    document.documentElement.style.setProperty('--s666-stage-peak',peak.toFixed(3));

    qa('.pc-addon-waveform i').forEach(function(el,i){
      var source=i%3===0?low:i%3===1?mid:high;
      var v=smooth('wave'+i,clamp(source*.72+pulse*.28,0,1),.88,.18);
      el.style.height=(10+v*88).toFixed(1)+'%';
      el.style.opacity=(.30+v*.70).toFixed(2);
      el.style.filter='brightness('+(1+v*.82).toFixed(2)+')';
    });

    qa('.pc-addon-beatline i').forEach(function(el,i){
      var v=smooth('beat'+i,clamp(pulse*(.68+(i%2)*.32)+peak*.20,0,1),.94,.10);
      el.style.height=(8+v*90).toFixed(1)+'%';
      el.style.opacity=(.24+v*.76).toFixed(2);
    });

    qa('.pc-addon-vu-grid .pc-vu-channel:first-child i').forEach(function(el,i){
      var v=smooth('vuL'+i,clamp((i?mid:low)*.60+level*.40,0,1),.88,.15);
      el.style.height=(7+v*92).toFixed(1)+'%';
      el.style.opacity=(.26+v*.74).toFixed(2);
    });

    qa('.pc-addon-vu-grid .pc-vu-channel:last-child i').forEach(function(el,i){
      var v=smooth('vuR'+i,clamp((i?high:mid)*.60+peak*.40,0,1),.88,.15);
      el.style.height=(7+v*92).toFixed(1)+'%';
      el.style.opacity=(.26+v*.74).toFixed(2);
    });

    qa('.pc-addon-reactor-core').forEach(function(el){
      var s=smooth('reactor',clamp(low*.54+level*.24+peak*.22,0,1),.84,.14);
      el.style.transform='scale('+(0.88+s*.24).toFixed(3)+')';
      el.style.filter='brightness('+(1+s*.62).toFixed(2)+') saturate('+(1+s*.86).toFixed(2)+') drop-shadow(0 0 '+(8+s*28).toFixed(1)+'px rgba(22,255,243,.35))';
    });

    qa('.phase-line').forEach(function(el){
      var s=smooth('phaseLine',clamp(mid*.55+high*.25+pulse*.20,0,1),.86,.16);
      el.style.transform='rotate('+(-55+s*110).toFixed(1)+'deg) scaleX('+(0.56+s*.72).toFixed(3)+')';
      el.style.opacity=(.30+s*.68).toFixed(2);
    });
  }

  function drive(bus){
    if(!bus||typeof bus!=='object')return;
    state.bus=bus;
    var level=smooth('masterLevel',clamp(bus.level,0,1),.84,.14);
    var peak=smooth('masterPeak',clamp(bus.peak==null?bus.level:bus.peak,0,1),.94,.10);
    var pulse=clamp(Math.max(0,peak-state.lastPeak)*2.8+Math.abs(level-state.lastLevel)*4.8,0,1);
    state.lastLevel=level;
    state.lastPeak=peak;
    var eq=Array.isArray(bus.eq)?bus.eq:[];
    var low=avg(eq.slice(0,Math.max(1,Math.floor(eq.length*.35))),level);
    var mid=avg(eq.slice(Math.floor(eq.length*.28),Math.max(2,Math.floor(eq.length*.72))),level);
    var high=avg(eq.slice(Math.floor(eq.length*.62)),level);

    setSideMeters([
      clamp(level*.52+low*.48,0,1),
      clamp(level*.48+mid*.52,0,1),
      clamp(level*.38+pulse*.62,0,1)
    ],'#leftMeterA,#leftMeterB,#leftMeterC','left');

    setSideMeters([
      clamp(level*.50+high*.50,0,1),
      clamp(level*.46+mid*.54,0,1),
      clamp(level*.36+peak*.64,0,1)
    ],'#rightMeterA,#rightMeterB,#rightMeterC','right');

    setBottom(level,peak,pulse);
    setEq(bus,level,peak);
    setPanelModules(bus,level,peak,pulse);
    driveSideLeds(bus,level,peak);
  }

  function installMeterBusHook(){
    var initial=window.__MeterBus;
    try{
      Object.defineProperty(window,'__MeterBus',{
        configurable:true,
        enumerable:true,
        get:function(){return state.bus;},
        set:function(v){state.bus=v;drive(v);}
      });
      if(initial){state.bus=initial;drive(initial);}
    }catch(e){
      state.bus=initial;
    }
  }

  function boot(){
    ensureSmallAdditions();
    installMeterBusHook();
    var attempts=0;
    var timer=setInterval(function(){
      ensureSmallAdditions();
      if(++attempts>12)clearInterval(timer);
    },500);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
})();
