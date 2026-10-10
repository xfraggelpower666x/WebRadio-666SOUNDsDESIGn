const { app, BrowserWindow, ipcMain, dialog, screen, protocol, net, shell, powerMonitor } = require('electron');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const radioCfg = require('./src/shared/radio-config.cjs');
let adminToken = '';
const remoteLocks = new Set();
const radioOrigin = new URL(radioCfg.radioBase).origin;

let mainWindow;
const outputWindows = new Map();
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

function trustedAppUrl(value) {
  try {
    const u = new URL(String(value || ''));
    const expected = pathToFileURL(path.join(__dirname, 'src', 'index.html'));
    return u.protocol === 'file:' && u.pathname === expected.pathname;
  } catch { return false; }
}
function senderRole(event) {
  if (!event?.sender || event.sender.isDestroyed()) return 'invalid';
  if (mainWindow && !mainWindow.isDestroyed() && event.sender.id === mainWindow.webContents.id) return 'main';
  for (const w of outputWindows.values()) if (w && !w.isDestroyed() && event.sender.id === w.webContents.id) return 'output';
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

function displayList(){ const primary=screen.getPrimaryDisplay(); return screen.getAllDisplays().map((d,i)=>({id:d.id,index:i,label:`Display ${i+1}${d.id===primary.id?' (Primary)':''}`,bounds:d.bounds,size:d.size,workArea:d.workArea,scaleFactor:d.scaleFactor,rotation:d.rotation,isPrimary:d.id===primary.id})); }
function outputStatus(){ const now=Date.now(); return {active:Array.from(outputWindows.entries()).filter(([,w])=>w&&!w.isDestroyed()).map(([id,w])=>{const h=outputHealth.get(id)||{};return {id,bounds:w.getBounds(),fullscreen:w.isFullScreen(),responsive:!!h.lastHeartbeat&&(now-h.lastHeartbeat)<15000,lastHeartbeat:h.lastHeartbeat||0,engine:h.engine||'unknown',fps:Number(h.fps)||0,recoveries:outputRecovery.get(id)||0};}),available:displayList()}; }
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
function broadcastSourceState(next){ sharedSourceState={...sharedSourceState,...sanitizeSourceState(next||{})}; for(const w of outputWindows.values())if(!w.isDestroyed())w.webContents.send('source:state',sharedSourceState); return {ok:true,state:sharedSourceState}; }

function createWindow() {
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
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  mainWindow.webContents.on('will-navigate',(e,url)=>{if(!trustedAppUrl(url))e.preventDefault();});
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (fileWriteStream) {
      fileWriteStream.end();
    }
  });
}


registerIpc('display:list','main', () => displayList());
registerIpc('display:open-output','main', (_e, ids) => openOutputWindows(ids));
registerIpc('display:status','main', () => outputStatus());
registerIpc('display:heartbeat','output', (e, payload={}) => { const hit=Array.from(outputWindows.entries()).find(([,w])=>w&&!w.isDestroyed()&&w.webContents.id===e.sender.id); if(!hit)return {ok:false}; const id=hit[0]; outputHealth.set(id,{lastHeartbeat:Date.now(),engine:String(payload.engine||'unknown').slice(0,40),fps:Math.max(0,Math.min(240,Number(payload.fps)||0))}); return {ok:true}; });
function runtimeDiagnostics(){const m=process.memoryUsage();return {generatedAt:new Date().toISOString(),version:app.getVersion(),platform:process.platform,arch:process.arch,electron:process.versions.electron,chrome:process.versions.chrome,node:process.versions.node,gpu:app.getGPUFeatureStatus(),memory:{rss:m.rss,heapTotal:m.heapTotal,heapUsed:m.heapUsed,external:m.external,arrayBuffers:m.arrayBuffers||0},source:{mode:sharedSourceState.mode,outputs:outputWindows.size},events:runtimeEvents.slice(-100),outputs:outputStatus(),displays:displayList().map(d=>({id:d.id,bounds:d.bounds,workArea:d.workArea,scaleFactor:d.scaleFactor,rotation:d.rotation,internal:d.internal}))};}
registerIpc('runtime:diagnostics','main', async()=>runtimeDiagnostics());
registerIpc('runtime:export-diagnostics','main', async()=>{const report=runtimeDiagnostics();const stamp=new Date().toISOString().replace(/[:.]/g,'-');const r=await dialog.showSaveDialog(mainWindow,{title:'Export SoundwaveStudio 666 Diagnostics',defaultPath:`RADIO-WAVE-v6.66-diagnostics-${stamp}.json`,filters:[{name:'JSON diagnostics',extensions:['json']}]});if(r.canceled||!r.filePath)return {ok:false,canceled:true};fs.writeFileSync(r.filePath,JSON.stringify(report,null,2),'utf8');return {ok:true,filePath:r.filePath};});
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
  if(!gotSingleInstanceLock)return;
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
  };
  screen.on('display-added',displayChanged); screen.on('display-removed',displayChanged); screen.on('display-metrics-changed',displayChanged);
  createWindow();
  startOutputWatchdog();
  powerMonitor.on('suspend',()=>{runtimeEvent('system-suspend');for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('runtime:lifecycle',{type:'suspend'});});
  powerMonitor.on('resume',()=>{runtimeEvent('system-resume');reconcileOutputWindows();for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('runtime:lifecycle',{type:'resume'});});
  powerMonitor.on('lock-screen',()=>runtimeEvent('screen-lock'));
  powerMonitor.on('unlock-screen',()=>runtimeEvent('screen-unlock'));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
  startOutputWatchdog();
  powerMonitor.on('suspend',()=>{runtimeEvent('system-suspend');for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('runtime:lifecycle',{type:'suspend'});});
  powerMonitor.on('resume',()=>{runtimeEvent('system-resume');reconcileOutputWindows();for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed())w.webContents.send('runtime:lifecycle',{type:'resume'});});
  powerMonitor.on('lock-screen',()=>runtimeEvent('screen-lock'));
  powerMonitor.on('unlock-screen',()=>runtimeEvent('screen-unlock'));
    }
  });
});

app.on('before-quit',()=>{if(outputWatchdog){clearInterval(outputWatchdog);outputWatchdog=null;} if(fileWriteStream){try{fileWriteStream.end();}catch{} fileWriteStream=null;} adminToken=''; soundCloudToken=null; runtimeEvent('app-before-quit');});

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
