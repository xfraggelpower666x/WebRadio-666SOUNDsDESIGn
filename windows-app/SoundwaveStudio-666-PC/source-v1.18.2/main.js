const { app, BrowserWindow, ipcMain, dialog, screen, protocol, net, shell, powerMonitor } = require('electron');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cp = require('child_process');

const STARTUP_LOG_PATH = path.join(os.tmpdir(), 'RADIO-WAVE-v6.66-startup.log');
function startupLog(type, detail='') {
  try {
    const line = `${new Date().toISOString()} [${type}] ${typeof detail==='string'?detail:JSON.stringify(detail)}\n`;
    fs.appendFileSync(STARTUP_LOG_PATH, line, 'utf8');
  } catch {}
}
function fatalStartup(code, error) {
  const message = `${code}: ${error?.stack || error?.message || error || 'unknown error'}`;
  startupLog('FATAL', message);
  try { dialog.showErrorBox('RADIO WAVE v6.66 · Startup Error', message + `\n\nLog: ${STARTUP_LOG_PATH}`); } catch {}
}
startupLog('BOOT', `pid=${process.pid} argv=${process.argv.join(' ')}`);
process.on('uncaughtException', error => { fatalStartup('UNCAUGHT_EXCEPTION', error); try { app.exit(1); } catch { process.exit(1); } });
process.on('unhandledRejection', error => { fatalStartup('UNHANDLED_REJECTION', error); });

let radioCfg;
try {
  radioCfg = require('./src/shared/radio-config.cjs');
  startupLog('CONFIG', 'radio-config loaded');
} catch (error) {
  fatalStartup('RADIO_CONFIG_LOAD_FAILED', error);
  throw error;
}
let adminToken = '';
const remoteLocks = new Set();
const radioOrigin = new URL(radioCfg.radioBase).origin;

let mainWindow;
let introWindow;
let mainReady=false;
let introComplete=false;
let introFailsafeTimer=null;
const outputWindows = new Map();
const detachedOverlayWindows = new Map();
let detachedVisualizerWindow=null;
let appQuitting=false;
const outputHealth = new Map();
const outputRecovery = new Map();
let sharedSourceState = {mode:'local'};
let selectedLocalAudioPath = '';
let soundCloudCurrent = null;
let soundCloudQueue = [];
let soundCloudQueueIndex = -1;
let soundCloudRevision = 0;
let soundCloudToken = null;
const SOUND_CLOUD_API='https://api.soundcloud.com';
const SOUND_CLOUD_AUTH='https://secure.soundcloud.com';
const SOUND_CLOUD_CREATOR_URL='https://soundcloud.com/fraggelpower666';
protocol.registerSchemesAsPrivileged([{scheme:'swmedia',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}},{scheme:'swsc',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-oop-rasterization');
app.commandLine.appendSwitch('accelerated-2d-canvas');
let fileWriteStream = null;
let approvedSavePath = '';
const runtimeEvents = [];
let outputWatchdog = null;
function runtimeEvent(type, detail={}) { runtimeEvents.push({at:new Date().toISOString(),type:String(type).slice(0,80),detail}); if(runtimeEvents.length>200)runtimeEvents.splice(0,runtimeEvents.length-200); }
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();
else app.on('second-instance',()=>{ if(mainWindow&&!mainWindow.isDestroyed()){ if(mainWindow.isMinimized())mainWindow.restore(); mainWindow.show(); mainWindow.focus(); runtimeEvent('second-instance-blocked'); }});

function trustedLocalFile(value,relativePath) {
  try {
    const u = new URL(String(value || ''));
    const expected = pathToFileURL(path.join(__dirname, relativePath));
    return u.protocol === 'file:' && u.pathname === expected.pathname;
  } catch { return false; }
}
const trustedAppUrl=value=>trustedLocalFile(value,path.join('src','index.html'));
const trustedIntroUrl=value=>trustedLocalFile(value,path.join('src','intro.html'));
const trustedOverlayUrl=value=>trustedLocalFile(value,path.join('src','overlay-window.html'));
function senderRole(event) {
  if (!event?.sender || event.sender.isDestroyed()) return 'invalid';
  if (mainWindow && !mainWindow.isDestroyed() && event.sender.id === mainWindow.webContents.id) return 'main';
  if (introWindow && !introWindow.isDestroyed() && event.sender.id === introWindow.webContents.id) return 'intro';
  for (const w of outputWindows.values()) if (w && !w.isDestroyed() && event.sender.id === w.webContents.id) return 'output';
  if (detachedVisualizerWindow && !detachedVisualizerWindow.isDestroyed() && event.sender.id === detachedVisualizerWindow.webContents.id) return 'output';
  for (const w of detachedOverlayWindows.values()) if (w && !w.isDestroyed() && event.sender.id === w.webContents.id) return 'overlay';
  return 'invalid';
}
function registerIpc(channel, roles, handler) {
  const allowed = new Set(Array.isArray(roles) ? roles : [roles]);
  ipcMain.handle(channel, async (event, ...args) => {
    const role = senderRole(event);
    if (!allowed.has(role)) throw new Error('ipc_sender_blocked');
    return handler(event, ...args);
  });
}


function radioUrl(route) {
  const u = new URL(String(route || ''), radioCfg.radioBase);
  if (u.origin !== radioOrigin) throw new Error('remote_origin_blocked');
  return u;
}
async function radioJson(route, opts = {}, auth = false) {
  const headers = { accept: 'application/json', ...(opts.body ? {'content-type':'application/json'} : {}) };
  if (auth) { if (!adminToken) throw new Error('auth_token_missing'); headers.authorization = `Bearer ${adminToken}`; }
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), radioCfg.requestTimeoutMs);
  try {
    const r = await fetch(radioUrl(route), {...opts, headers:{...headers,...opts.headers}, cache:'no-store', signal:ctl.signal});
    const text = await r.text(); if (Buffer.byteLength(text,'utf8') > 262144) throw new Error('response_too_large');
    let data={}; try { data=text?JSON.parse(text):{}; } catch { data={raw:text.slice(0,4096)}; }
    if (auth && (r.status===401 || r.status===403)) adminToken='';
    return {ok:r.ok,status:r.status,data};
  } catch(e) { if(e?.name==='AbortError') throw new Error('request_timeout'); throw e; } finally { clearTimeout(timer); }
}
async function authCheck() {
  if(!adminToken) return {ok:false,authOk:false,pwOk:false,error:'auth_token_missing'};
  const r=await radioJson(`${radioCfg.gateRoute}?t=${Date.now()}`,{method:'GET'},true);
  const ok=r.ok&&r.data?.ok===true&&r.data?.authOk===true&&r.data?.pwOk===true;
  if(!ok&&(r.status===401||r.status===403)) adminToken='';
  return {ok,authOk:r.data?.authOk===true,pwOk:r.data?.pwOk===true,error:r.data?.error||(!ok?'gate_check_failed':undefined)};
}
async function protectedPost(route,payload){ const gate=await authCheck(); if(!gate.ok) throw new Error(gate.error||'auth_required'); const r=await radioJson(route,{method:'POST',body:JSON.stringify(payload||{})},true); if(!r.ok||r.data?.ok!==true) throw new Error(r.data?.error||`HTTP_${r.status}`); return r.data; }
async function lock(name,fn){ if(remoteLocks.has(name)) return {ok:false,busy:true,reason:'request_in_flight'}; remoteLocks.add(name); try{return await fn();}finally{remoteLocks.delete(name);} }
function textValue(v,max,code){ if(typeof v!=='string'||!v.trim()||v.trim().length>max) throw new Error(code); return v.trim(); }

function soundCloudCredentials(){
  const clientId=String(process.env.SOUNDCLOUD_CLIENT_ID||'').trim();
  const clientSecret=String(process.env.SOUNDCLOUD_CLIENT_SECRET||'').trim();
  return {clientId,clientSecret,configured:!!(clientId&&clientSecret)};
}
async function soundCloudAccessToken(){
  const c=soundCloudCredentials(); if(!c.configured) throw new Error('soundcloud_credentials_missing');
  const now=Date.now(); if(soundCloudToken&&soundCloudToken.expiresAt>now+60000)return soundCloudToken.accessToken;
  let body,headers={accept:'application/json','content-type':'application/x-www-form-urlencoded'};
  if(soundCloudToken?.refreshToken){body=new URLSearchParams({grant_type:'refresh_token',client_id:c.clientId,client_secret:c.clientSecret,refresh_token:soundCloudToken.refreshToken});}
  else {headers.authorization=`Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString('base64')}`;body=new URLSearchParams({grant_type:'client_credentials'});}
  const r=await soundCloudFetch(`${SOUND_CLOUD_AUTH}/oauth/token`,{method:'POST',headers,body,cache:'no-store'});
  const data=await r.json().catch(()=>({})); if(!r.ok||!data.access_token){soundCloudToken=null;throw new Error(data.error||`soundcloud_token_HTTP_${r.status}`);}
  soundCloudToken={accessToken:String(data.access_token),refreshToken:String(data.refresh_token||''),expiresAt:now+Math.max(60,Number(data.expires_in)||3600)*1000}; return soundCloudToken.accessToken;
}
function soundCloudPermalink(value){
  let u; try{u=new URL(String(value||'').trim());}catch{throw new Error('soundcloud_url_invalid');}
  if(!/(^|\.)soundcloud\.com$/i.test(u.hostname))throw new Error('soundcloud_url_invalid'); return u.href;
}
async function soundCloudFetch(url,opts={}){const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),15000);try{return await fetch(url,{...opts,signal:ctl.signal,cache:'no-store'});}catch(e){if(e?.name==='AbortError')throw new Error('soundcloud_timeout');throw e;}finally{clearTimeout(timer);}}
async function soundCloudApi(pathname){
  let token=await soundCloudAccessToken(); let r=await soundCloudFetch(`${SOUND_CLOUD_API}${pathname}`,{headers:{accept:'application/json',authorization:`OAuth ${token}`}});
  if(r.status===401){soundCloudToken=null;token=await soundCloudAccessToken();r=await soundCloudFetch(`${SOUND_CLOUD_API}${pathname}`,{headers:{accept:'application/json',authorization:`OAuth ${token}`}});}
  const data=await r.json().catch(()=>({})); if(!r.ok)throw new Error(data.error?.message||data.error||`soundcloud_HTTP_${r.status}`); return data;
}
function normalizeSoundCloudTrack(track,fallback){
  if(!track||track.access==='blocked')return null;
  const urn=String(track.urn||'').trim(); const id=String(track.id||urn.split(':').pop()||'').trim(); if(!urn&&!id)return null;
  return {urn:urn||`soundcloud:tracks:${id}`,id,permalink:track.permalink_url||fallback,title:track.title||'SoundCloud',artist:track.metadata_artist||track.user?.username||'SoundCloud',artwork:track.artwork_url||track.user?.avatar_url||'',access:track.access||'playable'};
}
function activateSoundCloudIndex(index){
  if(!soundCloudQueue.length)throw new Error('soundcloud_queue_empty');
  const n=((Number(index)||0)%soundCloudQueue.length+soundCloudQueue.length)%soundCloudQueue.length;
  soundCloudQueueIndex=n; soundCloudCurrent=soundCloudQueue[n]; soundCloudRevision++;
  const mediaUrl=`swsc://audio/current?v=${soundCloudRevision}`;
  const state={mode:'soundcloud',src:mediaUrl,name:soundCloudCurrent.title,artist:soundCloudCurrent.artist,permalink:soundCloudCurrent.permalink,artwork:soundCloudCurrent.artwork,queueIndex:n,queueLength:soundCloudQueue.length}; broadcastSourceState(state);
  return {...soundCloudCurrent,mediaUrl,queueIndex:n,queueLength:soundCloudQueue.length};
}
async function resolveSoundCloud(permalink){
  const href=soundCloudPermalink(permalink); const resource=await soundCloudApi(`/resolve?url=${encodeURIComponent(href)}`);
  const raw=resource&&resource.kind==='track'?[resource]:(Array.isArray(resource?.tracks)?resource.tracks:[]);
  soundCloudQueue=raw.map(t=>normalizeSoundCloudTrack(t,href)).filter(Boolean); soundCloudQueueIndex=-1;
  if(!soundCloudQueue.length)throw new Error('soundcloud_no_playable_track');
  return activateSoundCloudIndex(0);
}

function normalizeSoundCloudCollection(item,kind){if(!item)return null;return {kind,title:String(item.title||'Untitled'),permalink:String(item.permalink_url||''),artwork:String(item.artwork_url||item.user?.avatar_url||''),trackCount:Number(item.track_count||item.tracks?.length||0)};}
async function soundCloudCreatorLibrary(){
  const creator=await soundCloudApi(`/resolve?url=${encodeURIComponent(SOUND_CLOUD_CREATOR_URL)}`);
  const creatorUrn=String(creator?.urn||''); if(!creatorUrn)throw new Error('soundcloud_creator_urn_missing');
  const [tracksRaw,playlistsRaw]=await Promise.all([soundCloudApi(`/users/${encodeURIComponent(creatorUrn)}/tracks?access=playable&limit=100&linked_partitioning=true`),soundCloudApi(`/users/${encodeURIComponent(creatorUrn)}/playlists?limit=100&linked_partitioning=true`)]);
  const list=x=>Array.isArray(x)?x:(Array.isArray(x?.collection)?x.collection:[]);
  return {creator:{username:creator.username||'666SOUNDsDESIGN - Fraggelpower666',permalink:creator.permalink_url||SOUND_CLOUD_CREATOR_URL,avatar:creator.avatar_url||''},tracks:list(tracksRaw).map(x=>normalizeSoundCloudCollection(x,'track')).filter(x=>x?.permalink),playlists:list(playlistsRaw).map(x=>normalizeSoundCloudCollection(x,'playlist')).filter(x=>x?.permalink)};
}
function soundCloudStep(delta){return activateSoundCloudIndex(soundCloudQueueIndex+(Number(delta)||0));}
function soundCloudQueueState(){return {index:soundCloudQueueIndex,length:soundCloudQueue.length,current:soundCloudCurrent?{title:soundCloudCurrent.title,artist:soundCloudCurrent.artist,permalink:soundCloudCurrent.permalink}:null};}

const DETACHED_OVERLAY_KEYS=new Set(['source','media','wave','position','text','engines','milkdrop','diagnostics','export','dock']);
function overlayStatePath(){return path.join(app.getPath('userData'),'radio-wave-detached-overlays.json');}
function readOverlayState(){try{return JSON.parse(fs.readFileSync(overlayStatePath(),'utf8'));}catch{return {windows:{}};}}
function writeOverlayState(state){try{fs.writeFileSync(overlayStatePath(),JSON.stringify(state,null,2),'utf8');}catch{}}
function overlayBoundsFor(key,fallback={}){
  const state=readOverlayState(); const s=state.windows?.[key]||{};
  const base={x:Number(s.x),y:Number(s.y),width:Number(s.width),height:Number(s.height)};
  const valid=Number.isFinite(base.x)&&Number.isFinite(base.y)&&Number.isFinite(base.width)&&Number.isFinite(base.height);
  if(valid){
    const all=screen.getAllDisplays();
    const intersects=all.some(d=>base.x+base.width>d.workArea.x&&base.x<d.workArea.x+d.workArea.width&&base.y+base.height>d.workArea.y&&base.y<d.workArea.y+d.workArea.height);
    if(intersects)return {x:Math.round(base.x),y:Math.round(base.y),width:Math.max(320,Math.round(base.width)),height:Math.max(220,Math.round(base.height))};
  }
  const d=mainWindow&&!mainWindow.isDestroyed()?screen.getDisplayMatching(mainWindow.getBounds()):screen.getPrimaryDisplay();
  const wa=d.workArea;
  const width=Math.min(Math.max(320,Number(fallback.width)||440),Math.max(320,wa.width-40));
  const height=Math.min(Math.max(220,Number(fallback.height)||520),Math.max(220,wa.height-40));
  return {x:wa.x+Math.max(20,wa.width-width-40),y:wa.y+Math.max(20,Math.round((wa.height-height)/2)),width,height};
}
function saveDetachedOverlayWindow(key,w,open=true){
  if(!w||w.isDestroyed())return;
  const state=readOverlayState(); if(!state.windows)state.windows={};
  const b=w.getBounds(); const d=screen.getDisplayMatching(b);
  state.windows[key]={x:b.x,y:b.y,width:b.width,height:b.height,displayId:d.id,scaleFactor:d.scaleFactor,open:!!open};
  writeOverlayState(state);
}
function openDetachedOverlay(payload={}){
  const key=String(payload.key||'');
  if(!DETACHED_OVERLAY_KEYS.has(key))throw new Error('overlay_key_invalid');
  const title=String(payload.title||key).slice(0,80);
  const html=String(payload.html||'');
  if(Buffer.byteLength(html,'utf8')>512*1024)throw new Error('overlay_markup_too_large');
  const controls=Array.isArray(payload.controls)?payload.controls.slice(0,256):[];
  const existing=detachedOverlayWindows.get(key);
  if(existing&&!existing.isDestroyed()){existing.show();existing.focus();existing.webContents.send('workspace:overlay-sync',{controls});return {ok:true,key,focused:true};}
  const bounds=overlayBoundsFor(key,payload);
  const w=new BrowserWindow({
    ...bounds,
    minWidth:320,minHeight:220,
    title:'RADIO WAVE · '+title,
    icon:fs.existsSync(path.join(__dirname,'build','radio-wave-v6.66.ico'))?path.join(__dirname,'build','radio-wave-v6.66.ico'):undefined,
    autoHideMenuBar:true,
    show:false,
    backgroundColor:'#05030d',
    webPreferences:{preload:path.join(__dirname,'overlay-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}
  });
  detachedOverlayWindows.set(key,w);
  w.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  w.webContents.on('will-navigate',(e,url)=>{if(!trustedOverlayUrl(url))e.preventDefault();});
  w.loadFile(path.join(__dirname,'src','overlay-window.html'),{query:{key}});
  w.webContents.on('did-finish-load',()=>w.webContents.send('workspace:overlay-init',{key,title,html,controls}));
  w.once('ready-to-show',()=>{w.show();w.focus();});
  const persist=()=>saveDetachedOverlayWindow(key,w,true);
  w.on('move',persist);w.on('resize',persist);
  w.on('close',()=>{if(!appQuitting)saveDetachedOverlayWindow(key,w,false);});
  w.on('closed',()=>{detachedOverlayWindows.delete(key);if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('workspace:overlay-closed',{key});});
  saveDetachedOverlayWindow(key,w,true);
  return {ok:true,key,bounds:w.getBounds()};
}
function detachedOverlayState(){return readOverlayState();}
function emitMainWindowMetrics(reason='window'){
  if(!mainWindow||mainWindow.isDestroyed())return;
  const bounds=mainWindow.getBounds();
  const display=screen.getDisplayMatching(bounds);
  mainWindow.webContents.send('window:metrics',{reason,bounds,contentBounds:mainWindow.getContentBounds(),display:{id:display.id,bounds:display.bounds,workArea:display.workArea,scaleFactor:display.scaleFactor,rotation:display.rotation}});
}
function openDetachedVisualizer(){
  if(detachedVisualizerWindow&&!detachedVisualizerWindow.isDestroyed()){
    detachedVisualizerWindow.show();detachedVisualizerWindow.focus();return {ok:true,focused:true,bounds:detachedVisualizerWindow.getBounds()};
  }
  const state=readOverlayState(); const s=state.windows?.visualizerNative||{};
  const d=screen.getDisplayMatching(mainWindow.getBounds());
  const wa=d.workArea;
  const b=(Number.isFinite(s.x)&&Number.isFinite(s.y)&&Number.isFinite(s.width)&&Number.isFinite(s.height))
    ? {x:s.x,y:s.y,width:Math.max(480,s.width),height:Math.max(300,s.height)}
    : {x:wa.x+40,y:wa.y+40,width:Math.min(1100,wa.width-80),height:Math.min(720,wa.height-80)};
  const w=new BrowserWindow({
    ...b,minWidth:480,minHeight:300,resizable:true,frame:true,show:false,
    title:'RADIO WAVE v6.66 · VISUALIZER',
    backgroundColor:'#01000f',autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,backgroundThrottling:false}
  });
  detachedVisualizerWindow=w;
  const persist=()=>{
    if(!w||w.isDestroyed())return;
    const st=readOverlayState();if(!st.windows)st.windows={};
    const bounds=w.getBounds();const disp=screen.getDisplayMatching(bounds);
    st.windows.visualizerNative={...bounds,displayId:disp.id,scaleFactor:disp.scaleFactor,open:true};
    writeOverlayState(st);
  };
  w.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  w.webContents.on('will-navigate',(e,url)=>{if(!trustedAppUrl(url))e.preventDefault();});
  w.loadFile(path.join(__dirname,'src','index.html'),{query:{output:'1',windowed:'1',visualDetached:'1'}});
  w.webContents.on('did-finish-load',()=>{w.webContents.send('source:state',sharedSourceState);});
  w.once('ready-to-show',()=>{w.show();w.focus();});
  w.on('move',persist);w.on('resize',persist);
  w.on('close',()=>{if(!appQuitting){const st=readOverlayState();if(!st.windows)st.windows={};st.windows.visualizerNative={...(st.windows.visualizerNative||{}),...w.getBounds(),open:false};writeOverlayState(st);}});
  w.on('closed',()=>{detachedVisualizerWindow=null;if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('visualizer:detached-closed');});
  persist();
  return {ok:true,bounds:w.getBounds()};
}
function focusDetachedVisualizer(){
  if(detachedVisualizerWindow&&!detachedVisualizerWindow.isDestroyed()){detachedVisualizerWindow.show();detachedVisualizerWindow.focus();return {ok:true};}
  return {ok:false};
}
function displayList(){ const primary=screen.getPrimaryDisplay(); return screen.getAllDisplays().map((d,i)=>({id:d.id,index:i,label:`Display ${i+1}${d.id===primary.id?' (Primary)':''}`,bounds:d.bounds,size:d.size,workArea:d.workArea,scaleFactor:d.scaleFactor,rotation:d.rotation,isPrimary:d.id===primary.id})); }
function outputStatus(){ const now=Date.now(); return {detachedVisualizer:detachedVisualizerWindow&&!detachedVisualizerWindow.isDestroyed()?{bounds:detachedVisualizerWindow.getBounds(),visible:detachedVisualizerWindow.isVisible(),focused:detachedVisualizerWindow.isFocused()}:null,active:Array.from(outputWindows.entries()).filter(([,w])=>w&&!w.isDestroyed()).map(([id,w])=>{const h=outputHealth.get(id)||{};return {id,bounds:w.getBounds(),fullscreen:w.isFullScreen(),responsive:!!h.lastHeartbeat&&(now-h.lastHeartbeat)<15000,lastHeartbeat:h.lastHeartbeat||0,engine:h.engine||'unknown',fps:Number(h.fps)||0,recoveries:outputRecovery.get(id)||0};}),available:displayList()}; }
function startOutputWatchdog(){
  if(outputWatchdog)clearInterval(outputWatchdog);
  outputWatchdog=setInterval(()=>{
    const now=Date.now();
    for(const [id,w] of outputWindows){
      if(!w||w.isDestroyed())continue;
      const h=outputHealth.get(id)||{};
      if(!h.lastHeartbeat||now-h.lastHeartbeat<20000)continue;
      const attempts=outputRecovery.get(id)||0;
      if(attempts>=3)continue;
      outputRecovery.set(id,attempts+1); runtimeEvent('output-heartbeat-timeout',{displayId:id,attempt:attempts+1});
      try{w.reload();}catch{}
    }
  },10000);
  outputWatchdog.unref?.();
}
function reconcileOutputWindows(){ const all=screen.getAllDisplays(); const valid=new Map(all.map(d=>[d.id,d])); for(const [id,w] of outputWindows){ const d=valid.get(id); if(!d){try{w.close();}catch{} outputWindows.delete(id); continue;} if(w&&!w.isDestroyed()){const b=d.bounds; try{w.setBounds({x:b.x,y:b.y,width:b.width,height:b.height},false); if(!w.isFullScreen())w.setFullScreen(true);}catch{}} } return outputStatus(); }



function openOutputWindows(ids) {
  const wanted = Array.isArray(ids) ? ids.map(Number) : [];
  const all = screen.getAllDisplays();
  for (const [id, win] of outputWindows) { if (!wanted.includes(id)) { try { win.close(); } catch {} outputWindows.delete(id); } }
  for (const id of wanted) {
    const d = all.find(x => x.id === id); if (!d) continue;
    if (outputWindows.has(id) && !outputWindows.get(id).isDestroyed()) continue;
    const b=d.bounds;
    const w=new BrowserWindow({x:b.x,y:b.y,width:b.width,height:b.height,frame:false,fullscreen:true,backgroundColor:'#01000f',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,backgroundThrottling:false}});
    outputWindows.set(id,w); outputHealth.set(id,{lastHeartbeat:0,engine:'booting',fps:0}); w.webContents.setWindowOpenHandler(()=>({action:'deny'})); w.webContents.on('will-navigate',(e,url)=>{if(!trustedAppUrl(url))e.preventDefault();}); w.loadFile(path.join(__dirname,'src','index.html'),{query:{output:'1'}});
    w.webContents.on('did-finish-load',()=>{outputRecovery.set(id,0);w.webContents.send('source:state',sharedSourceState);});
    w.webContents.on('render-process-gone',(_e,details)=>{outputHealth.set(id,{lastHeartbeat:0,engine:'crashed',fps:0,reason:details?.reason||'unknown'}); const count=(outputRecovery.get(id)||0)+1; outputRecovery.set(id,count); if(count<=3&&!w.isDestroyed())setTimeout(()=>{try{w.reload();}catch{}},750);});
    w.webContents.on('unresponsive',()=>{const h=outputHealth.get(id)||{};outputHealth.set(id,{...h,lastHeartbeat:0,engine:'unresponsive'});});
    w.on('closed',()=>{outputWindows.delete(id);outputHealth.delete(id);});
  }
  return {ok:true,displayIds:Array.from(outputWindows.keys())};
}
function sanitizeSourceState(next){
  if(!next||typeof next!=='object'||Array.isArray(next))throw new Error('source_state_invalid');
  const out={};
  if(next.mode!==undefined){if(!['local','radio','soundcloud'].includes(next.mode))throw new Error('source_mode_invalid');out.mode=next.mode;}
  if(next.src!==undefined){const v=String(next.src);if(v.length>4096)throw new Error('source_url_too_long');const u=new URL(v);if(!['file:','swmedia:','swsc:','http:','https:'].includes(u.protocol))throw new Error('source_protocol_blocked');out.src=v;}
  for(const k of ['name','title','artist','dj','permalink','artwork','station','bitrate','codec','sampleRate','routeState','overlayMode'])if(next[k]!==undefined)out[k]=String(next[k]).slice(0,1024);
  if(next.listeners!==undefined)out.listeners=String(next.listeners).slice(0,64);
  if(next.tickerEnabled!==undefined)out.tickerEnabled=!!next.tickerEnabled;
  if(next.statusEnabled!==undefined)out.statusEnabled=!!next.statusEnabled;
  if(next.paused!==undefined)out.paused=!!next.paused;
  if(next.time!==undefined)out.time=Number.isFinite(Number(next.time))?Math.max(0,Number(next.time)):null;
  for(const k of ['queueIndex','queueLength'])if(next[k]!==undefined)out[k]=Math.max(0,Math.min(100000,Number(next[k])||0));
  if(next.visual!==undefined){const v=next.visual;if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('visual_state_invalid');out.visual={engine:String(v.engine||'soundwave').slice(0,40),milkdropPreset:String(v.milkdropPreset??'').slice(0,120),shaderPreset:String(v.shaderPreset||'').slice(0,120),geometryPreset:String(v.geometryPreset||'').slice(0,120)};if(v.importedMilkdrop&&typeof v.importedMilkdrop==='object'){const src=String(v.importedMilkdrop.source||'');if(Buffer.byteLength(src,'utf8')>2*1024*1024)throw new Error('visual_preset_too_large');out.visual.importedMilkdrop={id:String(v.importedMilkdrop.id||'imported').slice(0,240),source:src};}}
  return out;
}
function broadcastSourceState(next){ sharedSourceState={...sharedSourceState,...sanitizeSourceState(next||{})}; for(const w of outputWindows.values())if(!w.isDestroyed())w.webContents.send('source:state',sharedSourceState); if(detachedVisualizerWindow&&!detachedVisualizerWindow.isDestroyed())detachedVisualizerWindow.webContents.send('source:state',sharedSourceState); return {ok:true,state:sharedSourceState}; }

function destroyIntroWindow(){
  if(introFailsafeTimer){clearTimeout(introFailsafeTimer);introFailsafeTimer=null;}
  if(introWindow&&!introWindow.isDestroyed()){try{introWindow.destroy();}catch{}}
  introWindow=null;
}
function showMainAfterIntro(){
  if(!introComplete||!mainReady||!mainWindow||mainWindow.isDestroyed())return false;
  mainWindow.maximize();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('runtime:lifecycle',{type:'lyvra:system-start',product:'RADIO WAVE v6.66'});
  destroyIntroWindow();
  runtimeEvent('intro-handoff-complete',{event:'lyvra:system-start'});
  return true;
}
function createIntroWindow(){
  introWindow=new BrowserWindow({
    width:960,
    height:600,
    minWidth:760,
    minHeight:480,
    resizable:true,
    frame:false,
    center:true,
    show:false,
    autoHideMenuBar:true,
    backgroundColor:'#03030a',
    webPreferences:{
      preload:path.join(__dirname,'intro-preload.js'),
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:true,
      webSecurity:true,
      backgroundThrottling:false
    }
  });
  introWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  introWindow.webContents.on('will-navigate',(e,url)=>{if(!trustedIntroUrl(url))e.preventDefault();});
  introWindow.webContents.on('did-fail-load',(_e,code,desc,url)=>{
    startupLog('INTRO_LOAD_FAIL',{code,desc,url});
    introComplete=true;
    showMainAfterIntro();
  });
  introWindow.webContents.on('render-process-gone',(_e,details)=>{
    startupLog('INTRO_RENDER_GONE',details||{});
    introComplete=true;
    showMainAfterIntro();
  });
  introWindow.loadFile(path.join(__dirname,'src','intro.html')).catch(error=>{
    startupLog('INTRO_LOAD_PROMISE_FAIL',error?.stack||error?.message||String(error));
    introComplete=true;
    showMainAfterIntro();
  });
  introWindow.once('ready-to-show',()=>{
    startupLog('INTRO_READY_TO_SHOW');
    if(introWindow&&!introWindow.isDestroyed())introWindow.show();
  });
  introWindow.on('closed',()=>{startupLog('INTRO_CLOSED');introWindow=null;});
  introFailsafeTimer=setTimeout(()=>{
    runtimeEvent('intro-failsafe-handoff');
    introComplete=true;
    showMainAfterIntro();
  },14000);
  introFailsafeTimer.unref?.();
  runtimeEvent('intro-created');
}

function createWindow() {
  const radioWaveIcon=path.join(__dirname,'build','radio-wave-v6.66.ico');
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1280,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false // Crucial so background recording doesn't stall
    },
    title: 'RADIO WAVE v6.66',
    icon: fs.existsSync(radioWaveIcon) ? radioWaveIcon : undefined,
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  mainWindow.webContents.on('will-navigate',(e,url)=>{if(!trustedAppUrl(url))e.preventDefault();});
  mainWindow.webContents.on('did-fail-load',(_e,code,desc,url)=>{
    startupLog('MAIN_LOAD_FAIL',{code,desc,url});
    fatalStartup('MAIN_UI_LOAD_FAILED',`${code} ${desc} ${url}`);
  });
  mainWindow.webContents.on('render-process-gone',(_e,details)=>{
    startupLog('MAIN_RENDER_GONE',details||{});
    fatalStartup('MAIN_RENDERER_GONE',JSON.stringify(details||{}));
  });
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html')).catch(error=>{
    startupLog('MAIN_LOAD_PROMISE_FAIL',error?.stack||error?.message||String(error));
    fatalStartup('MAIN_UI_LOAD_PROMISE_FAILED',error);
  });

  mainWindow.once('ready-to-show', () => {
    mainReady=true;
    startupLog('MAIN_READY_HIDDEN');
    runtimeEvent('main-ready-hidden');
    showMainAfterIntro();
  });

  ['resize','move','maximize','unmaximize','restore','enter-full-screen','leave-full-screen'].forEach(ev=>mainWindow.on(ev,()=>emitMainWindowMetrics(ev)));
  mainWindow.webContents.on('did-finish-load',()=>setTimeout(()=>emitMainWindowMetrics('did-finish-load'),0));

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (fileWriteStream) {
      fileWriteStream.end();
    }
  });
}


registerIpc('intro:complete','intro', async()=>{
  if(introComplete)return {ok:true,duplicate:true};
  introComplete=true;
  runtimeEvent('intro-sequence-complete');
  showMainAfterIntro();
  return {ok:true};
});

registerIpc('workspace:overlay-open','main',(_e,payload)=>openDetachedOverlay(payload));
registerIpc('workspace:overlay-state','main',()=>detachedOverlayState());
registerIpc('workspace:overlay-focus','main',(_e,key)=>{const w=detachedOverlayWindows.get(String(key||''));if(w&&!w.isDestroyed()){w.show();w.focus();return {ok:true};}return {ok:false};});
registerIpc('workspace:overlay-sync','main',(_e,key,payload={})=>{
  const k=String(key||'');
  if(!DETACHED_OVERLAY_KEYS.has(k))throw new Error('overlay_key_invalid');
  const w=detachedOverlayWindows.get(k);
  if(!w||w.isDestroyed())return {ok:false};
  const html=payload.html===undefined?undefined:String(payload.html||'').slice(0,512*1024);
  const controls=Array.isArray(payload.controls)?payload.controls.slice(0,256):undefined;
  w.webContents.send('workspace:overlay-sync',{html,controls});
  return {ok:true};
});
registerIpc('workspace:overlay-ready','overlay',(e)=>{const hit=Array.from(detachedOverlayWindows.entries()).find(([,w])=>w&&!w.isDestroyed()&&w.webContents.id===e.sender.id);return {ok:!!hit,key:hit?.[0]||''};});
registerIpc('workspace:overlay-action','overlay',(_e,payload={})=>{
  if(!mainWindow||mainWindow.isDestroyed())return {ok:false};
  const key=String(payload.key||'');
  if(!DETACHED_OVERLAY_KEYS.has(key))throw new Error('overlay_key_invalid');
  const kind=String(payload.kind||'');
  if(!['input','change','click'].includes(kind))throw new Error('overlay_action_invalid');
  const id=String(payload.id||'').slice(0,120);
  const selector=String(payload.selector||'').slice(0,180);
  if(!id&&!selector)throw new Error('overlay_control_invalid');
  if(selector&&!/^\[data-(?:source|open-window)="[a-zA-Z0-9:_-]+"\]$/.test(selector))throw new Error('overlay_selector_invalid');
  mainWindow.webContents.send('workspace:overlay-action',{key,kind,id,selector,value:String(payload.value??'').slice(0,8192),checked:!!payload.checked});
  return {ok:true};
});
registerIpc('display:list','main', () => displayList());
registerIpc('display:open-output','main', (_e, ids) => openOutputWindows(ids));
registerIpc('display:status','main', () => outputStatus());
registerIpc('display:open-detached-visualizer','main',()=>openDetachedVisualizer());
registerIpc('display:focus-detached-visualizer','main',()=>focusDetachedVisualizer());
registerIpc('display:heartbeat','output', (e, payload={}) => {
  const hit=Array.from(outputWindows.entries()).find(([,w])=>w&&!w.isDestroyed()&&w.webContents.id===e.sender.id);
  if(hit){const id=hit[0];outputHealth.set(id,{lastHeartbeat:Date.now(),engine:String(payload.engine||'unknown').slice(0,40),fps:Math.max(0,Math.min(240,Number(payload.fps)||0))});return {ok:true};}
  if(detachedVisualizerWindow&&!detachedVisualizerWindow.isDestroyed()&&detachedVisualizerWindow.webContents.id===e.sender.id)return {ok:true,detached:true};
  return {ok:false};
});
registerIpc('visual:frame','main', (_e, payload={}) => {
  const freq=payload.frequency, wave=payload.time;
  if(!Array.isArray(freq)||!Array.isArray(wave))throw new Error('visual_frame_invalid');
  if(freq.length<8||freq.length>4096||wave.length<16||wave.length>8192)throw new Error('visual_frame_size_invalid');
  const clamp=a=>a.map(v=>Math.max(0,Math.min(255,Number(v)||0)));
  const frame={frequency:clamp(freq),time:clamp(wave),at:Date.now()};
  for(const w of outputWindows.values())if(w&&!w.isDestroyed())w.webContents.send('visual:frame',frame);
  if(detachedVisualizerWindow&&!detachedVisualizerWindow.isDestroyed())detachedVisualizerWindow.webContents.send('visual:frame',frame);
  return {ok:true,outputs:outputWindows.size+(detachedVisualizerWindow&&!detachedVisualizerWindow.isDestroyed()?1:0)};
});
function runtimeDiagnostics(){
  const m=process.memoryUsage();
  const mainBounds=mainWindow&&!mainWindow.isDestroyed()?mainWindow.getBounds():null;
  const mainDisplay=mainBounds?screen.getDisplayMatching(mainBounds):null;
  const overlays=Array.from(detachedOverlayWindows.entries()).filter(([,w])=>w&&!w.isDestroyed()).map(([key,w])=>{
    const bounds=w.getBounds();const d=screen.getDisplayMatching(bounds);
    return {key,bounds,displayId:d.id,scaleFactor:d.scaleFactor,visible:w.isVisible(),focused:w.isFocused()};
  });
  return {
    generatedAt:new Date().toISOString(),product:'RADIO WAVE v6.66',version:app.getVersion(),
    platform:process.platform,arch:process.arch,electron:process.versions.electron,chrome:process.versions.chrome,node:process.versions.node,
    gpu:app.getGPUFeatureStatus(),
    memory:{rss:m.rss,heapTotal:m.heapTotal,heapUsed:m.heapUsed,external:m.external,arrayBuffers:m.arrayBuffers||0},
    source:{mode:sharedSourceState.mode,outputs:outputWindows.size},
    workspace:{mainWindow:mainBounds?{bounds:mainBounds,displayId:mainDisplay?.id,scaleFactor:mainDisplay?.scaleFactor}:null,detachedOverlays:overlays},
    events:runtimeEvents.slice(-100),outputs:outputStatus(),
    displays:displayList().map(d=>({id:d.id,bounds:d.bounds,workArea:d.workArea,scaleFactor:d.scaleFactor,rotation:d.rotation,internal:d.internal}))
  };
}
registerIpc('runtime:diagnostics','main', async()=>runtimeDiagnostics());
registerIpc('runtime:export-diagnostics','main', async()=>{const report=runtimeDiagnostics();const stamp=new Date().toISOString().replace(/[:.]/g,'-');const r=await dialog.showSaveDialog(mainWindow,{title:'Export RADIO WAVE v6.66 Diagnostics',defaultPath:`RADIO-WAVE-v6.66-diagnostics-${stamp}.json`,filters:[{name:'JSON diagnostics',extensions:['json']}]});if(r.canceled||!r.filePath)return {ok:false,canceled:true};fs.writeFileSync(r.filePath,JSON.stringify(report,null,2),'utf8');return {ok:true,filePath:r.filePath};});
registerIpc('source:sync','main', (_e, state) => broadcastSourceState(state));
registerIpc('window:fullscreen','main', (_e, enabled) => { if(mainWindow&&!mainWindow.isDestroyed()) mainWindow.setFullScreen(!!enabled); return {ok:true,fullscreen:!!enabled}; });
registerIpc('soundcloud:status','main',()=>({configured:soundCloudCredentials().configured,creatorUrl:SOUND_CLOUD_CREATOR_URL}));
registerIpc('soundcloud:library','main',()=>soundCloudCreatorLibrary());
registerIpc('soundcloud:resolve','main',(_e,url)=>resolveSoundCloud(url));
registerIpc('soundcloud:next','main',()=>soundCloudStep(1));
registerIpc('soundcloud:previous','main',()=>soundCloudStep(-1));
registerIpc('soundcloud:queue-state','main',()=>soundCloudQueueState());
registerIpc('soundcloud:open-current','main',async()=>{if(!soundCloudCurrent?.permalink)throw new Error('soundcloud_track_missing');await shell.openExternal(soundCloudPermalink(soundCloudCurrent.permalink));return {ok:true};});
registerIpc('radio:config','main', () => ({stream:new URL(radioCfg.stream,radioCfg.radioBase).href,fallback:new URL(radioCfg.fallbackStream,radioCfg.radioBase).href,radioBase:radioCfg.radioBase}));
registerIpc('radio:nowplaying','main', async()=>{const r=await radioJson(radioCfg.nowPlaying);if(!r.ok)throw new Error(`HTTP_${r.status}`);return r.data;});
registerIpc('auth:login','main', async(_e,password)=>{const value=textValue(password,512,'password_invalid');adminToken='';const r=await radioJson(radioCfg.loginRoute,{method:'POST',body:JSON.stringify({password:value})});if(!r.ok||r.data?.ok!==true||!r.data?.token)throw new Error(r.data?.error||'login_rejected');adminToken=String(r.data.token);const gate=await authCheck();if(!gate.ok){adminToken='';throw new Error(gate.error||'gate_check_failed');}return gate;});
registerIpc('auth:check','main',()=>authCheck());
registerIpc('auth:logout','main',()=>{adminToken='';return {ok:true};});
registerIpc('radio:skip','main',()=>lock('skip',()=>protectedPost(radioCfg.skipRoute,{source:'soundwave-studio-666'})));
registerIpc('radio:discord-message','main',(_e,message)=>lock('discord',()=>protectedPost(radioCfg.discordMessageRoute,{message:textValue(message,radioCfg.messageMax,'invalid_message'),manual:true,source:'soundwave-studio-666'})));
registerIpc('radio:discord-manual','main',(_e,payload)=>lock('discord',()=>protectedPost(radioCfg.discordManualRoute,{...(payload||{}),manual:true,source:'soundwave-studio-666'})));
registerIpc('radio:discord-nowplaying','main',(_e,payload)=>lock('discord',()=>protectedPost(radioCfg.discordNowPlayingRoute,{...(payload||{}),force:true,source:'soundwave-studio-666'})));
registerIpc('player-alert:send','main',async(_e,payload)=>lock('player-alert',async()=>{const message=textValue(payload?.message,radioCfg.playerAlertMax,'invalid_player_message');const senderId=textValue(payload?.senderId,80,'invalid_sender_id');const r=await radioJson(radioCfg.playerAlertSendRoute,{method:'POST',headers:{origin:radioOrigin,referer:radioCfg.radioBase+'/'},body:JSON.stringify({message,username:'SOUNDWAVE 666',senderId,clientId:senderId,source:'soundwave-studio-666'})});if(!r.ok||r.data?.ok!==true)throw new Error(r.data?.error||`HTTP_${r.status}`);return r.data;}));
registerIpc('player-alert:current','main',async()=>{const r=await radioJson(radioCfg.playerAlertCurrentRoute);if(!r.ok||r.data?.ok===false)throw new Error(r.data?.error||`HTTP_${r.status}`);return r.data;});
registerIpc('player-alert:history','main',async()=>{const r=await radioJson(radioCfg.playerAlertHistoryRoute);if(!r.ok||r.data?.ok===false)throw new Error(r.data?.error||`HTTP_${r.status}`);return r.data;});
registerIpc('player-alert:status','main',async()=>{const r=await radioJson(radioCfg.playerAlertStatusRoute);if(!r.ok||r.data?.ok===false)throw new Error(r.data?.error||`HTTP_${r.status}`);return r.data;});

app.whenReady().then(() => {
  startupLog('APP_READY');
  if(!gotSingleInstanceLock){startupLog('SINGLE_INSTANCE_LOCK_DENIED');return;}
  const ses=require('electron').session.defaultSession;
  ses.setPermissionCheckHandler(()=>false); ses.setPermissionRequestHandler((_wc,_perm,cb)=>cb(false));
  protocol.handle('swsc', async(request)=>{
    const u=new URL(request.url);
    if(u.hostname!=='audio'||u.pathname!=='/current'||!soundCloudCurrent)return new Response('Not found',{status:404});
    try{const token=await soundCloudAccessToken();const r=await net.fetch(`${SOUND_CLOUD_API}/tracks/${encodeURIComponent(soundCloudCurrent.urn||soundCloudCurrent.id)}/stream`,{headers:{authorization:`OAuth ${token}`,accept:'*/*'}});if(r.status===401){soundCloudToken=null;const retry=await soundCloudAccessToken();return await net.fetch(`${SOUND_CLOUD_API}/tracks/${encodeURIComponent(soundCloudCurrent.urn||soundCloudCurrent.id)}/stream`,{headers:{authorization:`OAuth ${retry}`,accept:'*/*'}});}return r;}catch(e){return new Response(String(e.message||e),{status:502});}
  });
  protocol.handle('swmedia', (request) => {
    const u = new URL(request.url);
    if (u.hostname !== 'audio' || u.pathname !== '/current' || !selectedLocalAudioPath) return new Response('Not found', {status:404});
    return net.fetch(pathToFileURL(selectedLocalAudioPath).toString(), {headers: request.headers});
  });
  const displayChanged=()=>{
    reconcileOutputWindows();
    for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('display:changed',displayList());
    emitMainWindowMetrics('display-metrics-changed');
  };
  screen.on('display-added',displayChanged); screen.on('display-removed',displayChanged); screen.on('display-metrics-changed',displayChanged);
  createIntroWindow();
  createWindow();
  startOutputWatchdog();
  powerMonitor.on('suspend',()=>{runtimeEvent('system-suspend');for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('runtime:lifecycle',{type:'suspend'});});
  powerMonitor.on('resume',()=>{runtimeEvent('system-resume');reconcileOutputWindows();for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('runtime:lifecycle',{type:'resume'});});
  powerMonitor.on('lock-screen',()=>runtimeEvent('screen-lock'));
  powerMonitor.on('unlock-screen',()=>runtimeEvent('screen-unlock'));

  app.on('activate', () => {
    startupLog('APP_ACTIVATE');
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
  startOutputWatchdog();
  powerMonitor.on('suspend',()=>{runtimeEvent('system-suspend');for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('runtime:lifecycle',{type:'suspend'});});
  powerMonitor.on('resume',()=>{runtimeEvent('system-resume');reconcileOutputWindows();for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('runtime:lifecycle',{type:'resume'});});
  powerMonitor.on('lock-screen',()=>runtimeEvent('screen-lock'));
  powerMonitor.on('unlock-screen',()=>runtimeEvent('screen-unlock'));
    }
  });
}).catch(error=>{
  fatalStartup('APP_READY_CHAIN_FAILED',error);
  try{app.exit(1);}catch{}
});

app.on('before-quit',()=>{appQuitting=true;startupLog('APP_BEFORE_QUIT');destroyIntroWindow();if(outputWatchdog){clearInterval(outputWatchdog);outputWatchdog=null;} if(fileWriteStream){try{fileWriteStream.end();}catch{} fileWriteStream=null;} adminToken=''; soundCloudToken=null; runtimeEvent('app-before-quit');});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for Native Dialogs and File operations
registerIpc('dialog:openAudio','main', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Audio Song',
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  selectedLocalAudioPath = filePath;
  const mediaUrl = 'swmedia://audio/current';
  broadcastSourceState({mode:'local',src:mediaUrl,name:path.basename(filePath)});
  return { name: path.basename(filePath), mediaUrl };
});

registerIpc('dialog:openMilkdrop','main', async()=>{
  const result=await dialog.showOpenDialog(mainWindow,{title:'Import MilkDrop Preset',filters:[{name:'MilkDrop Presets',extensions:['milk']}],properties:['openFile']});
  if(result.canceled||!result.filePaths[0])return null; const filePath=result.filePaths[0]; const st=fs.statSync(filePath); if(st.size>2*1024*1024)throw new Error('milk_preset_too_large');
  const source=fs.readFileSync(filePath,'utf8'); if(!source.trim())throw new Error('milk_preset_empty'); return {name:path.basename(filePath),source};
});

function personalMilkdropRoot(){return path.join(app.getPath('userData'),'milkdrop-personal-library');}
function personalMilkdropManifestPath(){return path.join(personalMilkdropRoot(),'RADIO-WAVE-PERSONAL-LIBRARY.json');}
function safeWalkMilkdropLibrary(root){
  const allowed=new Set(['.milk','.milk2','.txt','.jpg','.jpeg','.png','.gif','.shape','.wave','.fx']);
  const files=[];let total=0;
  const walk=dir=>{
    for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,ent.name);
      if(ent.isSymbolicLink())continue;
      if(ent.isDirectory()){walk(full);continue;}
      if(!ent.isFile())continue;
      const ext=path.extname(ent.name).toLowerCase();
      if(!allowed.has(ext))continue;
      const st=fs.statSync(full);
      if(st.size<=0||st.size>8*1024*1024)continue;
      total+=st.size;
      if(total>512*1024*1024)throw new Error('personal_library_too_large');
      files.push({full,relativePath:path.relative(root,full),name:ent.name,ext,size:st.size});
      if(files.length>5000)throw new Error('personal_library_too_many_files');
    }
  };
  if(fs.existsSync(root))walk(root);
  return files;
}
function personalMilkdropLibraryState(includeSources=false){
  const root=personalMilkdropRoot();
  if(!fs.existsSync(root))return {installed:false,root,count:0,milk:0,milk2:0,presets:[],top100:[],license:null};
  const files=safeWalkMilkdropLibrary(root);
  const milk=files.filter(x=>x.ext==='.milk');
  const milk2=files.filter(x=>x.ext==='.milk2');
  const licenseFile=files.find(x=>/docs[\\/]license\.txt$/i.test(x.relativePath)||/^license\.txt$/i.test(x.relativePath));
  const topFile=files.find(x=>/playlist[\\/]top100\.txt$/i.test(x.relativePath));
  const top100=topFile?fs.readFileSync(topFile.full,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(x=>path.basename(x.replace(/\\/g,'/'))):[];
  const topSet=new Set(top100.map(x=>x.toLowerCase()));
  const presets=milk.map(x=>({id:'personal:'+x.relativePath.replace(/\\/g,'/'),name:x.name,relativePath:x.relativePath.replace(/\\/g,'/'),source:includeSources?fs.readFileSync(x.full,'utf8'):undefined,top100:topSet.has(x.name.toLowerCase()),format:'milk'}));
  const doubles=milk2.map(x=>({id:'personal2:'+x.relativePath.replace(/\\/g,'/'),name:x.name,relativePath:x.relativePath.replace(/\\/g,'/'),top100:topSet.has(x.name.toLowerCase()),format:'milk2'}));
  return {installed:true,root,count:milk.length+milk2.length,milk:milk.length,milk2:milk2.length,presets,doubles,top100Count:top100.length,license:licenseFile?fs.readFileSync(licenseFile.full,'utf8'):null};
}
function extractPersonalMilkdropZip(zipPath){
  if(process.platform!=='win32')throw new Error('personal_library_import_windows_only');
  const st=fs.statSync(zipPath);
  if(!st.isFile()||st.size<=0||st.size>256*1024*1024)throw new Error('personal_library_zip_invalid');
  const root=personalMilkdropRoot();
  const temp=root+'-incoming';
  try{fs.rmSync(temp,{recursive:true,force:true});}catch{}
  fs.mkdirSync(temp,{recursive:true});
  const escapedZip=String(zipPath).replace(/'/g,"''");
  const escapedDest=String(temp).replace(/'/g,"''");
  const script=`$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath '${escapedZip}' -DestinationPath '${escapedDest}' -Force`;
  const r=cp.spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:4*1024*1024});
  if(r.status!==0)throw new Error('personal_library_extract_failed:'+String(r.stderr||r.stdout||'').slice(0,600));
  const files=safeWalkMilkdropLibrary(temp);
  const milk=files.filter(x=>x.ext==='.milk').length;
  const milk2=files.filter(x=>x.ext==='.milk2').length;
  if(milk<1)throw new Error('personal_library_no_milk_presets');
  try{fs.rmSync(root,{recursive:true,force:true});}catch{}
  fs.renameSync(temp,root);
  const state=personalMilkdropLibraryState(false);
  fs.writeFileSync(personalMilkdropManifestPath(),JSON.stringify({installedAt:new Date().toISOString(),sourceZip:path.basename(zipPath),milk:state.milk,milk2:state.milk2,count:state.count,personalUse:true,redistribution:false},null,2),'utf8');
  runtimeEvent('personal-milkdrop-library-imported',{milk:state.milk,milk2:state.milk2,count:state.count});
  return state;
}

registerIpc('dialog:openMilkdropPack','main', async()=>{
  const result=await dialog.showOpenDialog(mainWindow,{title:'Import MilkDrop Preset Folder',properties:['openDirectory']});
  if(result.canceled||!result.filePaths[0])return null;
  const root=path.resolve(result.filePaths[0]);
  const out=[]; let total=0;
  const MAX_FILES=128, MAX_FILE=2*1024*1024, MAX_TOTAL=16*1024*1024;
  const walk=dir=>{
    if(out.length>=MAX_FILES||total>=MAX_TOTAL)return;
    for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
      if(out.length>=MAX_FILES||total>=MAX_TOTAL)break;
      const full=path.join(dir,ent.name);
      if(ent.isSymbolicLink())continue;
      if(ent.isDirectory()){walk(full);continue;}
      if(!ent.isFile()||path.extname(ent.name).toLowerCase()!=='.milk')continue;
      const st=fs.statSync(full);
      if(st.size<=0||st.size>MAX_FILE||total+st.size>MAX_TOTAL)continue;
      const source=fs.readFileSync(full,'utf8');
      if(!source.trim())continue;
      total+=st.size;
      out.push({name:ent.name,relativePath:path.relative(root,full),source});
    }
  };
  walk(root);
  return {folder:path.basename(root),count:out.length,totalBytes:total,truncated:out.length>=MAX_FILES||total>=MAX_TOTAL,presets:out};
});

registerIpc('dialog:importMilkdropPersonalLibrary','main',async()=>{
  const result=await dialog.showOpenDialog(mainWindow,{title:'Import Personal MilkDrop3 Library ZIP',filters:[{name:'ZIP archives',extensions:['zip']}],properties:['openFile']});
  if(result.canceled||!result.filePaths[0])return null;
  return extractPersonalMilkdropZip(result.filePaths[0]);
});
registerIpc('milkdrop:personal-library','main',async()=>personalMilkdropLibraryState(true));
registerIpc('milkdrop:personal-library-license','main',async()=>{const s=personalMilkdropLibraryState(false);return {installed:s.installed,license:s.license||''};});

registerIpc('dialog:openBackground','main', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Background Image',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const st = fs.statSync(filePath); if(!st.isFile())throw new Error('background_not_file'); if(st.size>32*1024*1024)throw new Error('background_too_large');
  const imgData = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mimeMap={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',bmp:'image/bmp'}; const mimeType=mimeMap[ext]; if(!mimeType)throw new Error('background_type_blocked');
  const dataUri = `data:${mimeType};base64,${imgData.toString('base64')}`;

  return {
    path: filePath,
    name: path.basename(filePath),
    dataUri: dataUri
  };
});

registerIpc('dialog:getSavePath','main', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Soundwave Video',
    defaultPath: path.join(app.getPath('videos'), 'RADIO-WAVE-v6.66-visual.mp4'),
    filters: [
      { name: 'MP4 Video', extensions: ['mp4'] },
      { name: 'WebM Video', extensions: ['webm'] }
    ]
  });

  approvedSavePath = result.canceled ? '' : path.resolve(result.filePath);
  return approvedSavePath || null;
});

registerIpc('file:startWrite','main', async (event, savePath) => {
  try {
    const resolved = path.resolve(String(savePath || ''));
    if (!approvedSavePath || resolved !== approvedSavePath) throw new Error('save_path_not_approved');
    approvedSavePath = '';
    if (fileWriteStream) {
      fileWriteStream.end();
    }
    fileWriteStream = fs.createWriteStream(savePath);
    return { success: true };
  } catch (error) {
    console.error('Error starting file write:', error);
    return { success: false, error: error.message };
  }
});

registerIpc('file:writeChunk','main', async (event, chunkBuffer) => {
  return new Promise((resolve) => {
    if (!fileWriteStream) {
      resolve({ success: false, error: 'Write stream not initialized' });
      return;
    }
    // Write the Uint8Array buffer
    const buffer = Buffer.from(chunkBuffer);
    if (buffer.length > 8 * 1024 * 1024) { resolve({success:false,error:'write_chunk_too_large'}); return; }
    const result = fileWriteStream.write(buffer);

    if (result) {
      resolve({ success: true });
    } else {
      fileWriteStream.once('drain', () => {
        resolve({ success: true });
      });
    }
  });
});

registerIpc('file:close','main', async () => {
  return new Promise((resolve) => {
    if (fileWriteStream) {
      fileWriteStream.end(() => {
        fileWriteStream = null;
        resolve({ success: true });
      });
    } else {
      resolve({ success: true });
    }
  });
});
