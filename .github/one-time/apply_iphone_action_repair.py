from pathlib import Path
import re
R=Path('.')
def rd(p):return (R/p).read_text()
def wr(p,s):(R/p).write_text(s)
def one(s,a,b):
 if s.count(a)!=1: raise SystemExit(f'{a[:40]} count={s.count(a)}')
 return s.replace(a,b,1)
def pal(s):
 for a,b in {'#16fff3':'#168bff','#ff3dbb':'#b45cff','#47ff8a':'#7edcff','#20f7ff':'#168bff','#ff3fd7':'#b45cff','#60ff9b':'#7edcff','#9b5cff':'#b45cff','rgba(22,255,243':'rgba(22,139,255','rgba(255,61,187':'rgba(180,92,255','rgba(71,255,138':'rgba(126,220,255','rgba(32,247,255':'rgba(22,139,255','rgba(255,63,215':'rgba(180,92,255','rgba(96,255,155':'rgba(126,220,255'}.items():s=s.replace(a,b)
 return s

# VELUNA HTML authority + mirrors
h=rd('veluna/index.html')
for a,b in [
('/js/veluna-viewport-lock.js?v=2026-07-13-veluna-v1220','/js/veluna-viewport-lock.js?v=2026-07-16-iphone-action-v1223'),
('/css/addons/discord-player-addon-v3.css?v=2026-07-06-veluna-v126','/css/addons/discord-player-addon-v3.css?v=2026-07-16-iphone-action-v1223'),
('/css/veluna-theme.css?v=2026-07-09-veluna-v1212','/css/veluna-theme.css?v=2026-07-16-laser-v1223'),
('/js/addons/discord-player-addon-v3.js?v=2026-07-06-veluna-v126','/js/addons/discord-player-addon-v3.js?v=2026-07-16-iphone-action-v1223')]:h=one(h,a,b)
helpers="""    function setTransportUi(state='stop'){const map={play:playBtn,pause:pauseBtn,stop:stopBtn,reconnect:reconnectBtn};[playBtn,pauseBtn,stopBtn,reconnectBtn].forEach(btn=>{if(!btn)return;btn.classList.remove('is-active','transport-active');btn.setAttribute('aria-pressed','false')});const active=map[state];if(active){active.classList.add('is-active','transport-active');active.setAttribute('aria-pressed','true')}document.documentElement.setAttribute('data-player-state',state==='play'?'playing':state==='pause'?'paused':'stopped');document.body.setAttribute('data-player-state',state==='play'?'playing':state==='pause'?'paused':'stopped')}
    function flashButton(btn){if(!btn)return;btn.classList.add('is-pressed');clearTimeout(btn.__pressTimer);btn.__pressTimer=setTimeout(()=>btn.classList.remove('is-pressed'),360)}
"""
h=one(h,'    function describeError(err)',helpers+'    function describeError(err)')
h=one(h,"        setLamp(audioLamp,'lamp-green');\n        updateMediaSession","        setLamp(audioLamp,'lamp-green');\n        setTransportUi('play');\n        updateMediaSession")
h=one(h,"        setLamp(audioLamp,'lamp-red');\n        if(fromBoot)","        setLamp(audioLamp,'lamp-red');\n        setTransportUi('stop');\n        if(fromBoot)")
newd="""    async function doDiscord(){activeSecureAction='discord';const restoreAudio=protectAudioDuringDialog();discordBtn.classList.add('is-busy');setAction('DISCORD: Shooter-Fenster öffnen …','is-busy',discordBtn);try{if(window.S666DiscordPlayerAddonV3?.messagePost){await window.S666DiscordPlayerAddonV3.messagePost();setAction('DISCORD: Nachricht bereit','is-ok',discordBtn);return}const response=await fetch(ENDPOINTS.discordMessage,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify(Object.assign(discordPayload(),{message:lastTitle||'VELUNA WebRadio'}))});const data=await response.json().catch(()=>({}));if(!response.ok||data.ok!==true)throw new Error(data.error||data.message||('HTTP '+response.status));setAction('DISCORD: gesendet','is-ok',discordBtn)}catch(err){setAction('DISCORD FEHLER: '+describeError(err),'is-error',discordBtn)}finally{discordBtn.classList.remove('is-busy');restoreAudio();activeSecureAction='idle'}}
"""
h,n=re.subn(r"    async function doDiscord\(\)\{.*?\}\n(?=    function openPanel)",newd,h,count=1,flags=re.S)
if n!=1:raise SystemExit('doDiscord')
old=next(x for x in h.splitlines() if x.startswith("    playBtn.addEventListener('click'"))
handlers="""    playBtn.addEventListener('click',()=>{setTransportUi('play');void playCurrent('Play',false)});pauseBtn.addEventListener('click',()=>{audioStartController.cancel();audio.pause();stopMetadata();soundEngine.stop();setStatus('Paused');setLamp(audioLamp,'lamp-amber');setTransportUi('pause')});stopBtn.addEventListener('click',()=>{audioStartController.cancel();userStopped=true;switching=false;stopMetadata();soundEngine.stop();resetAudio();setStatus('Stopped');setLamp(audioLamp,'lamp-red');setTransportUi('stop')});reconnectBtn.addEventListener('click',()=>{userStopped=false;setTransportUi('reconnect');void playCurrent('Reconnect',false)});muteBtn.addEventListener('click',()=>{muted=!muted;audio.muted=muted;muteBtn.textContent=muted?'UNMUTE':'MUTE';muteBtn.classList.toggle('is-active',muted);muteBtn.setAttribute('aria-pressed',muted?'true':'false')});primaryBtn.addEventListener('click',()=>void selectSource('main'));backupBtn.addEventListener('click',()=>void selectSource('back'));historyToggle.addEventListener('click',()=>{historyOpen=!historyOpen;historyOverlay.classList.toggle('hidden',!historyOpen);historyToggle.classList.toggle('is-active',historyOpen)});skipBtn.addEventListener('click',()=>void doSkip());discordBtn.addEventListener('click',()=>void doDiscord());soundBtn.addEventListener('click',()=>{openPanel(soundPanel);soundBtn.classList.add('is-active')});metaBtn.addEventListener('click',()=>{renderMetaDetail();openPanel(metaPanel);metaBtn.classList.add('is-active')});soundClose.addEventListener('click',()=>{closePanels();soundBtn.classList.remove('is-active')});metaClose.addEventListener('click',()=>{closePanels();metaBtn.classList.remove('is-active')});soundReset.addEventListener('click',()=>{soundEngine.reset();soundStatus.textContent='Sound neutral zurückgesetzt'});soundApply.addEventListener('click',()=>void soundEngine.start());document.addEventListener('click',ev=>{const b=ev.target?.closest?.('button,.small-btn,.control-btn,.source-led-btn,.tiny-btn');if(b)flashButton(b)},true);"""
h=h.replace(old,handlers,1)
h=h.replace("setLamp(audioLamp,'lamp-green');if(!overlay", "setLamp(audioLamp,'lamp-green');setTransportUi('play');if(!overlay",1)
h=one(h,'buildMeter();buildBoostUi();syncEqUi();updateSourceUi();renderHistory','buildMeter();buildBoostUi();syncEqUi();updateSourceUi();setTransportUi(\'stop\');renderHistory')
h=pal(h)
for p in ['veluna/index.html','VELUNA/index.html','public/veluna/index.html','public/VELUNA/index.html']:wr(p,h)

# Viewport follows actual Safari visual viewport
v=rd('js/veluna-viewport-lock.js').replace('fullscreen geometry lock v1.2.20','fullscreen geometry lock v1.2.23')
v=one(v,'document.documentElement.clientWidth ||\n        window.innerWidth ||\n        visual?.width ||','visual?.width ||\n        document.documentElement.clientWidth ||\n        window.innerWidth ||')
v=one(v,'window.innerHeight ||\n        document.documentElement.clientHeight ||\n        visual?.height ||','visual?.height ||\n        document.documentElement.clientHeight ||\n        window.innerHeight ||')
v=one(v,'    const nextWidth = Math.max(state.width, viewport.width);\n    const nextHeight = allowGrow ? Math.max(state.height, viewport.height) : viewport.height;','    const nextWidth = viewport.width;\n    const nextHeight = viewport.height;')
for p in ['js/veluna-viewport-lock.js','public/js/veluna-viewport-lock.js']:wr(p,v)

# One physical tap = one action
p=rd('js/phase10-stability-iphone-panel-hud.js').replace('phase10-stability-iphone-panel-hud-20260525','phase10-stability-iphone-panel-hud-20260716-single-tap')
p,n1=re.subn(r'\n\s*row\.addEventListener\("touchend".*?\n\s*\}, \{ passive:false, capture:true \}\);','',p,count=1,flags=re.S)
p,n2=re.subn(r'\n\s*hub\.addEventListener\("touchend".*?\n\s*\}, \{passive:false, capture:true\}\);','',p,count=1,flags=re.S)
if (n1,n2)!=(1,1):raise SystemExit(f'touch handlers {(n1,n2)}')
for x in ['js/phase10-stability-iphone-panel-hud.js','public/js/phase10-stability-iphone-panel-hud.js']:wr(x,p)

# Central theme: blue/violet laser, click authority, modal authority, full iPhone height
c=pal(rd('css/veluna-theme.css')).replace('VELUNA Central Player Theme v1.2.12','VELUNA Central Player Theme v1.2.23')
for a,b in [('#36a8ff','#168bff'),('#78d8ff','#7edcff'),('#9b4dff','#b45cff'),('#ff39c7','#b45cff'),('rgba(54,168,255','rgba(22,139,255'),('rgba(120,216,255','rgba(126,220,255'),('rgba(155,77,255','rgba(180,92,255'),('rgba(255,57,199','rgba(180,92,255')]:c=c.replace(a,b)
c=c.replace(':is(:hover,:focus-visible,.is-active)',':is(:hover,:focus-visible,:active,.is-active,.is-pressed,.transport-active,[aria-pressed="true"],[data-state="active"],[data-active="1"])')
authority="""
/* iPhone action/modal/laser authority v1.2.23 */
body[data-veluna-ui] :is(button,a,[role="button"],.control-btn,.small-btn,.source-led-btn,.tiny-btn,.status-chip){position:relative;z-index:8;pointer-events:auto!important;touch-action:manipulation!important;-webkit-tap-highlight-color:rgba(180,92,255,.28)}
body[data-veluna-ui] :is(.overlay,.panel-overlay,.history-overlay,.admin-overlay,.fp-admin-overlay,.s666-sound-overlay,.s666msg-overlay,.s666-discord-gate,.s666-discord-denied,.s666-player-alert-overlay,#s666AdminAuthOverlay,[role="dialog"]){z-index:2147483600!important;pointer-events:auto!important;isolation:isolate!important}
body[data-veluna-ui] :is(.fp-admin-hidden,.is-hidden,.s666-discord-gate--hidden,.s666-discord-denied--hidden){pointer-events:none!important}
body[data-veluna-ui] :is(.s666msg-panel,.s666-discord-gate-box,.s666-discord-denied-box,.s666-player-alert-panel,#s666AdminAuthOverlay .s666-auth-box){border-color:rgba(22,139,255,.72)!important;background:linear-gradient(135deg,rgba(180,92,255,.16),rgba(22,139,255,.10)),rgba(4,8,24,.97)!important;box-shadow:0 0 8px rgba(126,220,255,.88),0 0 26px rgba(22,139,255,.44),0 0 24px rgba(180,92,255,.26)!important}
"""
c=c.replace('/* Zentraler, panelbreiter Header.',authority+'\n/* Zentraler, panelbreiter Header.',1)
c=c.replace('width:100dvw!important;height:100dvh!important;min-height:100dvh!important;max-height:100dvh!important','width:var(--veluna-fixed-vw,100dvw)!important;height:var(--veluna-fixed-vh,100dvh)!important;min-height:var(--veluna-fixed-vh,100dvh)!important;max-height:var(--veluna-fixed-vh,100dvh)!important',1)
c=c.replace('body[data-veluna-ui] :is(.frame-stage,.app-shell){width:100dvw!important;height:100dvh!important;min-height:100dvh!important;max-height:100dvh!important;overflow:hidden!important}','body[data-veluna-ui] :is(.frame-stage,.app-shell){width:100%!important;height:100%!important;min-height:100%!important;max-height:100%!important;padding:0!important;overflow:hidden!important}',1)
c=re.sub(r'body\[data-veluna-page="veluna"\] \.player-card,body\[data-veluna-page="internal"\] \.player-card\{height:calc\(100dvh.*?overflow:hidden!important\}', 'body[data-veluna-page="veluna"] .player-card,body[data-veluna-page="internal"] .player-card{height:calc(100% - 8px)!important;max-height:calc(100% - 8px)!important;width:calc(100% - 8px)!important;max-width:calc(100% - 8px)!important;margin:4px!important;padding-bottom:max(6px,env(safe-area-inset-bottom))!important;overflow:hidden!important}',c,count=1)
c=c.replace('top:max(4px,env(safe-area-inset-top))!important;\n    right:max(4px,env(safe-area-inset-right))!important;\n    bottom:max(4px,env(safe-area-inset-bottom))!important;\n    left:max(4px,env(safe-area-inset-left))!important;','top:4px!important;\n    right:4px!important;\n    bottom:4px!important;\n    left:4px!important;',1)
for x in ['css/veluna-theme.css','public/css/veluna-theme.css']:wr(x,c)

# Existing overlay files, not new layers
for a,b,paths in [
('z-index:99999','z-index:2147483600',['css/player-admin-overlay.css','public/css/player-admin-overlay.css']),
('z-index:999999','z-index:2147483600',['css/sound-control-overlay-v1.css','public/css/sound-control-overlay-v1.css']),
('z-index:99980','z-index:2147483600',['js/messenger-overlay.js','public/js/messenger-overlay.js'])]:
 s=pal(rd(paths[0])).replace(a,b)
 for x in paths:wr(x,s)

u=pal(rd('css/phase10-stability-iphone-panel-hud.css')).replace('z-index:9999!important','z-index:2147483600!important')
u+='\n@media(max-width:760px){.s666-parity-mobile-hub,.s666-mobile-extra-row{position:relative!important;z-index:2147482400!important;pointer-events:auto!important}.s666-parity-mobile-hub button,.s666-mobile-extra-row button{pointer-events:auto!important;touch-action:manipulation!important}.s666-parity-mobile-hub button[data-active="1"],.s666-mobile-extra-row button[data-state="active"]{border-color:rgba(180,92,255,.94)!important;color:#fff!important;box-shadow:0 0 7px rgba(126,220,255,.95),0 0 17px rgba(22,139,255,.58),0 0 21px rgba(180,92,255,.45)!important}}\n'
for x in ['css/phase10-stability-iphone-panel-hud.css','public/css/phase10-stability-iphone-panel-hud.css']:wr(x,u)

t=rd('tests/viewport-fullscreen.test.mjs').replace('2026-07-13-veluna-v1220','2026-07-16-iphone-action-v1223').replace("test('viewport lock grows with Safari usable height'","test('viewport lock follows Safari visible viewport'")
t=t.replace("  assert.match(viewportLock, /Math\\.max\\(state\\.height, viewport\\.height\\)/);","  assert.match(viewportLock, /const nextWidth = viewport\\.width/);\n  assert.match(viewportLock, /const nextHeight = viewport\\.height/);\n  assert.doesNotMatch(viewportLock, /Math\\.max\\(state\\.height, viewport\\.height\\)/);")
wr('tests/viewport-fullscreen.test.mjs',t)
print('repair applied')
