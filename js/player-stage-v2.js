/*
 * 666SOUNDsDESIGn Player Stage V12.
 * Single MeterBus consumer for all non-core visuals.
 * EQ, side meters and bottom meter remain exclusively owned by equalizer.js.
 */
(function(){
  'use strict';
  if(window.__S666_PLAYER_STAGE_V2_CORRECTION__) return;
  window.__S666_PLAYER_STAGE_V2_CORRECTION__ = true;

  var state={
    smooth:Object.create(null),
    lastFrame:0,
    normalizeQueued:false,
    metadata:{title:'',dj:'',set:'',bitrate:'',listeners:'',source:''},
    phase:0
  };

  function q(selector,root){return (root||document).querySelector(selector);}
  function qa(selector,root){return Array.from((root||document).querySelectorAll(selector));}
  function clamp(value,min,max){value=Number(value)||0;return Math.max(min,Math.min(max,value));}
  function avg(values,fallback){if(!values||!values.length)return Number(fallback)||0;return values.reduce(function(sum,value){return sum+(Number(value)||0);},0)/values.length;}
  function smooth(key,target,attack,release){var previous=Number(state.smooth[key]||0);var rate=target>previous?(attack||.72):(release||.16);var next=previous+(target-previous)*rate;state.smooth[key]=next;return next;}
  function clean(value){return String(value||'').replace(/\s+/g,' ').trim();}
  function cleanTitle(value){return clean(value).replace(/^NOW\s*PLAYING\s*[:\-–—]?\s*/i,'');}
  function setRoot(name,value){document.documentElement.style.setProperty(name,value);}

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

  function setPanelChipState(button,state){
    if(!button)return;
    ['state-empty','state-off','state-ok','state-warn','state-error','state-main','state-api','state-external','state-backup'].forEach(function(name){button.classList.remove(name);});
    button.classList.add(state||'state-empty');
  }

  function openAdminPanel(){
    if(window.FPAdminOverlay&&typeof window.FPAdminOverlay.open==='function'){window.FPAdminOverlay.open();return true;}
    if(window.S666AdminOverlay&&typeof window.S666AdminOverlay.open==='function'){window.S666AdminOverlay.open();return true;}
    var trigger=q('#fp-admin-button,#fp-admin-open,.fp-admin-open,[data-admin-open],#adminButton,#adminBtn');
    if(trigger&&typeof trigger.click==='function'){trigger.click();return true;}
    toast('Admin-Panel ist nicht bereit.','error');return false;
  }

  async function toggleGoveePanel(){
    try{
      var runtime=window.S666GoveeSync;
      if(!runtime||typeof runtime.setEnabled!=='function')throw new Error('govee_runtime_not_ready');
      var current=typeof runtime.getState==='function'?runtime.getState():null;
      var next=!(current&&current.enabled===true);
      await runtime.setEnabled(next);
      toast('GOVEE / FX '+(next?'EIN':'AUS'));
      return next;
    }catch(error){toast(error&&error.message?error.message:'GOVEE / FX ist nicht bereit.','error');return false;}
  }

  function bindPanelButton(id,handler){
    var button=q('#'+id);if(!button||button.__s666PanelBound)return;
    button.__s666PanelBound=true;
    button.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();handler(button);});
  }

  function bindSystemPanelActions(){
    bindPanelButton('statusStream',function(){var audio=q('#radio')||q('audio');toast(audio&&!audio.paused?'STREAM: PLAY':'STREAM: READY');});
    bindPanelButton('statusBuffer',function(){var audio=q('#radio')||q('audio');var seconds=0;try{if(audio&&audio.buffered&&audio.buffered.length)seconds=Math.max(0,audio.buffered.end(audio.buffered.length-1)-audio.currentTime);}catch(_){}toast('BUFFER: '+seconds.toFixed(1)+' s');});
    bindPanelButton('statusSource',function(){var audio=q('#radio')||q('audio');var src=String(audio&&(audio.currentSrc||audio.getAttribute('src'))||'');toast(/fallback|backup/i.test(src)?'SOURCE: BACKUP':'SOURCE: MAIN');});
    bindPanelButton('statusMeta',function(){var meta=state.metadata.title?state.metadata:readDomMetadata();toast(meta.title?'META: '+meta.title:'META: WAIT');});
    bindPanelButton('statusWorker',async function(button){try{var response=await fetch('/health?t='+Date.now(),{cache:'no-store',credentials:'same-origin'});setPanelChipState(button,response.ok?'state-ok':'state-error');toast(response.ok?'WORKER: ONLINE':'WORKER: ERROR',response.ok?'':'error');}catch(error){setPanelChipState(button,'state-error');toast('WORKER: OFFLINE','error');}});
    bindPanelButton('statusAudio',function(){var audio=q('#radio')||q('audio');var ctx=window.__mffAudioContext||window.__radioAudioContext||window.__smfpAudioContext;toast('AUDIO: '+(audio&&!audio.paused?'PLAY':'READY')+' · '+(ctx&&ctx.state?ctx.state.toUpperCase():'MEDIA'));});
    bindPanelButton('statusWatchdog',function(){var root=document.documentElement;var stateName=root.getAttribute('data-central-audio-stability-v2')||'READY';var reason=root.getAttribute('data-central-audio-reason')||'';toast('WATCHDOG: '+stateName.toUpperCase()+(reason?' · '+reason:''));});
    bindPanelButton('statusReconnect',function(){var button=q('#reconnectBtn');if(button&&typeof button.click==='function'){button.click();toast('RECONNECT ausgelöst.');}else toast('Reconnect ist nicht bereit.','error');});
    bindPanelButton('statusMeter',function(){var bus=window.__MeterBus||{};var fresh=bus.ts&&Date.now()-Number(bus.ts)<1000;toast(fresh?'METER: '+Math.round(clamp(bus.level,0,1)*100)+'% · PEAK '+Math.round(clamp(bus.peak||0,0,1)*100)+'%':'METER: WAIT');});
    bindPanelButton('statusDiscord',function(){openDiscordShooter();});
    bindPanelButton('statusAdmin',function(){openAdminPanel();});
    bindPanelButton('statusGovee',function(){toggleGoveePanel();});
  }

  function addonStorageKey(side){return 's666_'+side+'_addon_fx';}
  function initialAddonState(side){try{return localStorage.getItem(addonStorageKey(side))!=='off';}catch(_){return true;}}
  function syncAddonLayoutMode(){
    var leftOff=document.body.classList.contains('pc-left-addon-off');
    var rightOff=document.body.classList.contains('pc-right-addon-off');
    document.body.classList.toggle('pc-single-addon-off',leftOff!==rightOff);
    document.body.classList.toggle('pc-both-addons-off',leftOff&&rightOff);
  }
  function applyAddonFx(side,on,persist){
    var offClass=side==='left'?'pc-left-addon-off':'pc-right-addon-off';
    var button=q(side==='left'?'#pcLeftFxToggle':'#pcRightFxToggle');
    var label=q(side==='left'?'#pcLeftFxState':'#pcRightFxState');
    document.body.classList.toggle(offClass,!on);
    document.documentElement.setAttribute('data-s666-'+side+'-fx',on?'on':'off');
    if(button){button.classList.toggle('is-on',on);button.setAttribute('aria-pressed',on?'true':'false');}
    if(label)label.textContent=on?'ON':'OFF';
    if(persist){try{localStorage.setItem(addonStorageKey(side),on?'on':'off');}catch(_){}}
    syncAddonLayoutMode();
  }
  function bindAddonFxToggles(){
    var left=q('#pcLeftFxToggle');var right=q('#pcRightFxToggle');
    if(left&&!left.__s666FxBound){left.__s666FxBound=true;applyAddonFx('left',initialAddonState('left'),false);left.addEventListener('click',function(){applyAddonFx('left',!left.classList.contains('is-on'),true);});}
    if(right&&!right.__s666FxBound){right.__s666FxBound=true;applyAddonFx('right',initialAddonState('right'),false);right.addEventListener('click',function(){applyAddonFx('right',!right.classList.contains('is-on'),true);});}
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

  function normalizeHeaderImage(image){
    if(!image)return;
    image.src='/assets/veluna/header/veluna-player-header.webp';
    image.alt='LYVRA · VELUNA · 666';
    image.classList.add('s666-canonical-header-image');
    image.setAttribute('width','1536');
    image.setAttribute('height','509');
    image.decoding='async';
  }

  function ensureMainHeader(){
    var hero=q('body[data-veluna-page="main"] .player-shell>.hero');
    if(hero){
      hero.classList.add('s666-main-header');hero.dataset.s666HeaderReady='1';
      var image=q('#pcHeaderNewLogo',hero)||q('img',hero);
      if(!image){image=new Image();hero.prepend(image);}
      image.classList.add('s666-main-header-image');normalizeHeaderImage(image);
      var line=q('.cockpit-copyright-inline',hero)||q('.s666-main-header-line',hero);
      if(!line){line=document.createElement('div');hero.appendChild(line);}
      line.classList.add('s666-main-header-line');
      line.textContent='© 666SOUNDsDESIGn WebRadio · CYBERSTREAM COCKPIT EDITION · Fragglepower666 · 2026';
      qa('.hero-brand-image,.hero-title,.hero-subtitle,.hero-label-row',hero).forEach(function(node){if(node!==image)node.hidden=true;});
    }
    qa('body[data-veluna-page="main"]>.veluna-global-header,body[data-veluna-page="main"] .frame-stage>.veluna-global-header').forEach(function(node){node.remove();});
    var mobile=q('#mffApp .mff-cyber-header');
    if(mobile){
      mobile.classList.add('s666-mobile-header');
      var image=q('img',mobile);if(!image){image=new Image();mobile.prepend(image);}normalizeHeaderImage(image);image.classList.add('s666-mobile-header-image');
      qa('img',mobile).slice(1).forEach(function(extra){extra.remove();});
    }
  }

  function readDomMetadata(){
    var title=cleanTitle(q('#metaLine')?.textContent||q('#nowPlayingTicker')?.textContent||q('#mffApp .mff-title h1 span')?.textContent||'');
    return {
      title:title,
      dj:clean(q('#djText')?.textContent||q('#mffApp .mff-card:nth-child(3) strong')?.textContent||''),
      set:'',
      bitrate:clean(q('#bitrateText')?.textContent||''),
      listeners:clean(q('#listenersText')?.textContent||''),
      source:clean(q('#statusSource .status-code')?.textContent||'')
    };
  }

  function metadataDetailText(meta){
    var parts=[];
    if(meta.dj)parts.push('DJ: '+meta.dj);
    if(meta.set)parts.push('SET: '+meta.set);
    if(meta.bitrate)parts.push(meta.bitrate);
    if(meta.listeners)parts.push(meta.listeners+' LISTENERS');
    if(meta.source)parts.push(meta.source);
    return parts.join(' · ');
  }

  function renderDesktopNowPlaying(){
    var panel=q('body[data-veluna-page="main"] .player-shell>.now-playing');if(!panel)return;
    panel.classList.add('s666-now-playing-canonical');
    var topline=q('.section-topline',panel);if(!topline)return;
    var textBox=topline.firstElementChild||topline;
    var kicker=q('.section-kicker',textBox);if(!kicker){kicker=document.createElement('div');kicker.className='section-kicker';textBox.prepend(kicker);}kicker.textContent='NOW PLAYING';
    var title=q('#metaLine',textBox)||q('.meta-line',textBox);if(!title){title=document.createElement('div');title.id='metaLine';title.className='meta-line';textBox.appendChild(title);}
    var meta=state.metadata.title?state.metadata:readDomMetadata();
    if(meta.title)title.textContent=meta.title;
    title.classList.add('s666-now-static-title');
    var detail=q('.s666-now-meta-detail',textBox);if(!detail){detail=document.createElement('div');detail.className='s666-now-meta-detail';textBox.appendChild(detail);}
    detail.textContent=metadataDetailText(meta)||'LIVE STREAM METADATA';
    var ticker=q('#nowPlayingTicker',panel)||q('.ticker-text',panel);
    if(ticker){ticker.classList.add('s666-title-marquee');if(meta.title&&cleanTitle(ticker.textContent)!==meta.title)ticker.textContent=meta.title;ticker.setAttribute('aria-label','Aktueller Titel: '+(meta.title||'Live Stream'));}
  }

  function renderMobileNowPlaying(){
    var app=q('#mffApp');if(!app)return;
    var small=q('.mff-title small',app);if(small)small.textContent='NOW PLAYING';
    var title=q('.mff-title h1 span',app)||q('.mff-title h1',app);if(title){if(state.metadata.title)title.textContent=state.metadata.title;title.classList.add('s666-title-marquee');}
    var subtitle=q('.mff-title h2',app);if(subtitle)subtitle.textContent=metadataDetailText(state.metadata)||'LIVE STREAM METADATA';
  }

  function applyMetadata(detail){
    detail=detail||{};
    state.metadata={
      title:cleanTitle(detail.title||state.metadata.title||''),
      dj:clean(detail.dj||state.metadata.dj||''),
      set:clean(detail.set||detail.show||detail.program||state.metadata.set||''),
      bitrate:clean(detail.bitrate||state.metadata.bitrate||''),
      listeners:clean(detail.listeners||state.metadata.listeners||''),
      source:clean(detail.source||state.metadata.source||'')
    };
    renderDesktopNowPlaying();renderMobileNowPlaying();
  }

  function sidePanel(side){
    var tower=q(side==='left'?'#pcLeftFxAddon .pc-addon-tower':'#pcRightFxAddon .pc-addon-tower');if(!tower)return;
    var id=side==='left'?'s666LeftStatusPanel':'s666RightStatusPanel';if(q('#'+id,tower))return;
    var panel=document.createElement('section');panel.id=id;panel.className='s666-side-status-panel';panel.dataset.side=side;
    var labels=side==='left'?['INPUT','RMS','PEAK','BUS']:['MAIN','BACK','META','SYNC'];
    panel.innerHTML='<div class="s666-side-status-title"><span>'+(side==='left'?'SIGNAL CORE':'ROUTE CORE')+'</span><b>LIVE</b></div><div class="s666-side-status-grid">'+labels.map(function(label){return'<span class="s666-side-led" data-led="'+label.toLowerCase()+'"><i></i><b>'+label+'</b></span>';}).join('')+'</div>';
    tower.appendChild(panel);
  }

  function setStatusLed(panel,key,on,kind){var element=q('#'+panel+' [data-led="'+key+'"]');if(!element)return;element.classList.remove('is-on','is-peak','is-back','is-warn');if(on)element.classList.add(kind||'is-on');}
  function driveStatus(bus,level,peak){
    var age=bus&&bus.ts?Date.now()-bus.ts:99999;var live=age<1000&&bus&&bus.source!=='synthetic';
    setStatusLed('s666LeftStatusPanel','input',age<1000);setStatusLed('s666LeftStatusPanel','rms',level>.04);setStatusLed('s666LeftStatusPanel','peak',peak>.62,'is-peak');setStatusLed('s666LeftStatusPanel','bus',live);
    var source=q('#statusSource');var backup=!!(source&&(source.classList.contains('state-backup')||source.classList.contains('state-fallback')));
    setStatusLed('s666RightStatusPanel','main',!backup&&live);setStatusLed('s666RightStatusPanel','back',backup,'is-back');
    var meta=q('#statusMeta');setStatusLed('s666RightStatusPanel','meta',!!(meta&&(meta.classList.contains('state-api')||meta.classList.contains('is-active'))));setStatusLed('s666RightStatusPanel','sync',live&&level>.025);
  }

  function spectrumBands(bus,level){
    var eq=bus&&Array.isArray(bus.eq)?bus.eq:[];
    var half=eq.length?eq.slice(0,Math.max(1,Math.ceil(eq.length/2))):[];
    var low=Number(bus?.low);if(!Number.isFinite(low))low=avg(half.slice(0,Math.max(1,Math.ceil(half.length*.34))),level);
    var mid=Number(bus?.mid);if(!Number.isFinite(mid))mid=avg(half.slice(Math.floor(half.length*.25),Math.max(2,Math.ceil(half.length*.72))),level);
    var high=Number(bus?.high);if(!Number.isFinite(high))high=avg(half.slice(Math.floor(half.length*.62)),level);
    return {eq:eq,half:half,low:clamp(low,0,1),mid:clamp(mid,0,1),high:clamp(high,0,1)};
  }

  function mapVector(values,count,fallback){
    var source=values&&values.length?values:fallback||[.02];var output=[];
    for(var index=0;index<count;index++){var sourceIndex=Math.round(index/Math.max(1,count-1)*(source.length-1));output.push(clamp(source[sourceIndex],0,1));}
    return output;
  }

  function setBars(selector,values,prefix,attack,release){
    qa(selector).forEach(function(element,index){var value=smooth(prefix+index,values[index%values.length]||0,attack,release);var visual=Math.pow(clamp(value,0,1),1.18);element.style.height=(5+visual*93).toFixed(1)+'%';element.style.opacity=(.24+visual*.72).toFixed(2);element.style.filter='brightness('+(1+visual*.42).toFixed(2)+') saturate('+(1+visual*.54).toFixed(2)+')';element.dataset.level=visual.toFixed(3);});
  }

  function setRailLed(id,level,peak){
    var led=q('#'+id);if(!led)return;var color=peak>.80?'#ff4444':peak>.56?'#ff3dbb':level>.24?'#16fff3':'#00cc66';var glow=8+peak*22;led.style.background=color;led.style.boxShadow='0 0 '+glow.toFixed(1)+'px '+color;led.style.opacity=(.48+level*.52).toFixed(2);
  }

  function driveReactiveVisuals(bus,level,peak,pulse,bands){
    var low=smooth('low',bands.low,.68,.14);var mid=smooth('mid',bands.mid,.64,.15);var high=smooth('high',bands.high,.72,.18);var energy=smooth('energy',level,.72,.14);var transient=smooth('transient',pulse,.84,.10);
    var left=bus&&Array.isArray(bus.left)?bus.left:[low,mid,peak];var right=bus&&Array.isArray(bus.right)?bus.right:[peak,mid,high];var stereo=clamp(Math.abs(avg(left,energy)-avg(right,energy))*2.5,0,1);
    state.phase=(state.phase+(.7+mid*1.8+high*1.1))%360;

    setRoot('--s666-stage-level',energy.toFixed(3));setRoot('--s666-stage-peak',peak.toFixed(3));setRoot('--s666-stage-pulse',transient.toFixed(3));
    setRoot('--s666-stage-low',low.toFixed(3));setRoot('--s666-stage-mid',mid.toFixed(3));setRoot('--s666-stage-high',high.toFixed(3));setRoot('--s666-stage-stereo',stereo.toFixed(3));
    setRoot('--veluna-bass',low.toFixed(3));setRoot('--veluna-mid',mid.toFixed(3));setRoot('--veluna-high',high.toFixed(3));setRoot('--veluna-pulse',transient.toFixed(3));
    setRoot('--s666-ticker-pulse',clamp(low*.58+transient*.42,0,1).toFixed(3));
    setRoot('--pc-phase-x',(50+(avg(right,mid)-avg(left,mid))*18).toFixed(1)+'%');setRoot('--pc-phase-y',(50+(high-low)*16).toFixed(1)+'%');
    setRoot('--pc-addon-phase-angle',(-58+116*stereo).toFixed(1)+'deg');setRoot('--pc-addon-phase-scale',(.76+mid*.30).toFixed(3));
    setRoot('--pc-radar-speed',(4.8-high*2.8).toFixed(2)+'s');setRoot('--pc-radar-glow',(8+peak*26).toFixed(1)+'px');

    setBars('.pc-addon-waveform i',mapVector(bands.half,12,[low,mid,high]),'wave',.76,.16);
    setBars('.pc-addon-beatline i',mapVector([transient,peak,transient*.7+high*.3,mid],8,[transient]),'beat',.86,.09);
    setBars('.pc-addon-vu-grid .pc-vu-channel:first-child i',mapVector(left,2,[low,mid]),'vuL',.78,.15);
    setBars('.pc-addon-vu-grid .pc-vu-channel:last-child i',mapVector(right,2,[mid,high]),'vuR',.78,.15);

    qa('.pc-addon-reactor-core').forEach(function(element){element.style.transform='scale('+(0.92+low*.13+transient*.05).toFixed(3)+') rotate('+(state.phase*.12).toFixed(1)+'deg)';element.style.filter='brightness('+(1+low*.42+transient*.18).toFixed(2)+') saturate('+(1+mid*.56).toFixed(2)+')';});
    qa('.pc-addon-radar em').forEach(function(element,index){var value=[low,mid,high,peak][index%4];var angle=(state.phase*(.45+index*.08)+index*83)*Math.PI/180;var radius=18+index*7+transient*5;element.style.left=(50+Math.cos(angle)*radius).toFixed(1)+'%';element.style.top=(50+Math.sin(angle)*radius).toFixed(1)+'%';element.style.transform='scale('+(0.72+value*.82).toFixed(3)+')';element.style.opacity=(.28+value*.70).toFixed(2);});
    qa('.phase-line').forEach(function(element){element.style.transform='translateY('+(-4+peak*8).toFixed(1)+'px) rotate('+(-64+128*stereo).toFixed(1)+'deg) scaleX('+(0.62+mid*.66).toFixed(3)+')';element.style.opacity=(.34+peak*.62).toFixed(2);});
    qa('.phase-cloud').forEach(function(element){element.style.transform='translate('+(-5+mid*10).toFixed(1)+'px,'+(-4+high*8).toFixed(1)+'px) scale('+(0.78+stereo*.30).toFixed(3)+') rotate('+(state.phase*.28).toFixed(1)+'deg)';element.style.opacity=(.24+mid*.66).toFixed(2);});
    qa('.pc-addon-module').forEach(function(module,index){var value=[low,mid,high,transient,stereo][index%5];module.style.borderColor='rgba(22,255,243,'+(.22+value*.42).toFixed(3)+')';module.style.boxShadow='inset 0 0 '+(9+value*18).toFixed(1)+'px rgba(22,255,243,.07),0 0 '+(6+value*16).toFixed(1)+'px rgba(180,92,255,.13)';});
    qa('.pc-addon-tower').forEach(function(tower){tower.style.filter='brightness('+(1+energy*.10).toFixed(2)+') saturate('+(1+mid*.18).toFixed(2)+')';});
    qa('.pc-addon-module-reactor footer b').forEach(function(label){label.textContent=Math.round(clamp(low*.68+energy*.32,0,1)*100)+'%';});
    setRailLed('dnaRailLedLeft',avg(left,energy),peak);setRailLed('dnaRailLedRight',avg(right,energy),peak);
  }

  function consumeMeterBus(timestamp){
    if(timestamp-state.lastFrame<33){requestAnimationFrame(consumeMeterBus);return;}state.lastFrame=timestamp;
    var bus=window.__MeterBus||{};var fresh=bus.ts&&Date.now()-bus.ts<1000;var targetLevel=fresh?clamp(bus.level,0,1):0;var targetPeak=fresh?clamp(bus.peak||targetLevel,0,1):0;var level=smooth('busLevel',targetLevel,.72,.08);var peak=smooth('busPeak',targetPeak,.78,.10);var pulse=fresh?clamp(bus.pulse||Math.max(0,peak-level),0,1):0;var bands=spectrumBands(bus,level);
    driveStatus(bus,level,peak);driveReactiveVisuals(bus,level,peak,pulse,bands);requestAnimationFrame(consumeMeterBus);
  }

  function normalizeUi(){ensureActionButtons();bindSystemPanelActions();bindAddonFxToggles();ensureMainHeader();renderDesktopNowPlaying();renderMobileNowPlaying();}
  function scheduleNormalize(){if(state.normalizeQueued)return;state.normalizeQueued=true;requestAnimationFrame(function(){state.normalizeQueued=false;normalizeUi();});}
  function boot(){
    installTouchFeedback();state.metadata=Object.assign(state.metadata,readDomMetadata());normalizeUi();sidePanel('left');sidePanel('right');
    if(!window.__S666_STAGE_BUS_LOOP__){window.__S666_STAGE_BUS_LOOP__=true;requestAnimationFrame(consumeMeterBus);}
  }

  window.addEventListener('s666:metadata-live',function(event){applyMetadata(event.detail||{});});
  window.addEventListener('smfpartworkchange',function(event){document.body?.setAttribute('data-s666-artwork-mode',event.detail?.mode||'fallback');});
  var observer=new MutationObserver(function(records){if(records.some(function(record){return record.addedNodes&&record.addedNodes.length;}))scheduleNormalize();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){boot();observer.observe(document.body,{childList:true,subtree:true});},{once:true});
  else{boot();observer.observe(document.body,{childList:true,subtree:true});}
  window.addEventListener('load',boot,{passive:true});
})();
