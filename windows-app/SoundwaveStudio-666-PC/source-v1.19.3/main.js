const { app, BrowserWindow, ipcMain, dialog, screen, protocol, net, shell, powerMonitor, safeStorage } = require('electron');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cp = require('child_process');
const { runPowerShell } = require('./src/shared/powershell.cjs');
const { createSoundCloudCredentialStore } = require('./src/shared/soundcloud-credentials.cjs');
const { readSelectedFiles: readVjDataFiles } = require('./src/shared/vj-data-files.cjs');
const { createSoundCloudStreamProxy } = require('./src/shared/soundcloud-stream.cjs');
const { createCyberStudioLauncher } = require('./src/shared/milkdrop-cyber-studio.cjs');
const { createAudioLibrary } = require('./src/shared/audio-library.cjs');
const { createAudioPermissionGate, forwardOverlayMicrophone } = require('./src/shared/audio-permissions.cjs');
const { createVjFiles } = require('./src/shared/vj-files.cjs');
const { validateVjState } = require('./src/shared/vj-sync.cjs');

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
const approvedWebsites = Object.freeze({
  radio: 'https://webradio.666soundsdesign-broadcaster.com/',
  lyvra: 'https://weblyvra.666soundsdesign-broadcaster.com/',
  neon: 'https://dashboard.666soundsdesign-broadcaster.com/',
  liveDashboard: 'https://webradio.666soundsdesign-broadcaster.com/dashboard',
  psyEngine: 'https://weblyvra.666soundsdesign-broadcaster.com/psy-engine/'
});

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
let localAudioQueue = [];
let localAudioQueueIndex = -1;
let localAudioRevision = 0;
let audioLibrary;
let audioLibraryTimer;
let soundCloudCurrent = null;
let soundCloudQueue = [];
let soundCloudQueueIndex = -1;
let soundCloudRevision = 0;
let soundCloudToken = null;
let soundCloudTokenRequest = null;
let soundCloudCredentialRevision = 0;
let soundCloudCredentialWrite = Promise.resolve();
const soundCloudCredentialStore = createSoundCloudCredentialStore(safeStorage, () => app.getPath('userData'));
const SOUND_CLOUD_API='https://api.soundcloud.com';
const SOUND_CLOUD_AUTH='https://secure.soundcloud.com';
const SOUND_CLOUD_CREATOR_URL='https://soundcloud.com/fraggelpower666';
protocol.registerSchemesAsPrivileged([{scheme:'swmedia',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}},{scheme:'swsc',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}},{scheme:'swvj',privileges:{standard:true,secure:true,corsEnabled:true,stream:true}}]);
const vjFiles = createVjFiles({fetchFile:(url,options)=>net.fetch(url,options)});
let vjPickerOpen = false;
let vjFollowerState = null;
let vjFollowerRevision = 0;
function broadcastVjState(state) {
  vjFollowerState = { revision: ++vjFollowerRevision, at: Date.now(), state };
  for (const w of outputWindows.values()) if (w && !w.isDestroyed()) w.webContents.send('vj:state', vjFollowerState);
  if (detachedVisualizerWindow && !detachedVisualizerWindow.isDestroyed()) detachedVisualizerWindow.webContents.send('vj:state', vjFollowerState);
}
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-oop-rasterization');
app.commandLine.appendSwitch('accelerated-2d-canvas');
let fileWriteStream = null;
let approvedSavePath = '';
let videoWriteState = null;
const runtimeEvents = [];
let outputWatchdog = null;
function runtimeEvent(type, detail={}) { runtimeEvents.push({at:new Date().toISOString(),type:String(type).slice(0,80),detail}); if(runtimeEvents.length>200)runtimeEvents.splice(0,runtimeEvents.length-200); }
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();
else app.on('second-instance',()=>{ if(mainWindow&&!mainWindow.isDestroyed()){ if(mainWindow.isMinimized())mainWindow.restore(); mainWindow.show(); mainWindow.focus(); runtimeEvent('second-instance-blocked'); }});

const LOCAL_AUDIO_EXTENSIONS=new Set(['.mp3','.wav','.m4a','.flac','.aac','.ogg']);
function localQueueStorePath(){return path.join(app.getPath('userData'),'radio-wave-local-queue.json');}
function validLocalAudioPath(value){
  try{
    const full=path.resolve(String(value||''));
    const st=fs.statSync(full);
    return st.isFile()&&LOCAL_AUDIO_EXTENSIONS.has(path.extname(full).toLowerCase())?full:'';
  }catch{return '';}
}
function persistLocalQueue(){
  try{
    fs.writeFileSync(localQueueStorePath(),JSON.stringify({
      version:1,
      index:localAudioQueueIndex,
      items:localAudioQueue
    },null,2),'utf8');
  }catch(e){runtimeEvent('local-queue-persist-error',{error:String(e.message||e)});}
}
function loadLocalQueueFromDisk(){
  try{
    const store=localQueueStorePath();
    if(!fs.existsSync(store))return;
    const data=JSON.parse(fs.readFileSync(store,'utf8'));
    const items=Array.isArray(data?.items)?data.items.map(validLocalAudioPath).filter(Boolean).slice(0,500):[];
    localAudioQueue=items;
    localAudioQueueIndex=items.length?Math.max(0,Math.min(items.length-1,Number(data?.index)||0)):-1;
    selectedLocalAudioPath=localAudioQueueIndex>=0?items[localAudioQueueIndex]:'';
    runtimeEvent('local-queue-restored',{count:items.length,index:localAudioQueueIndex});
  }catch(e){runtimeEvent('local-queue-restore-error',{error:String(e.message||e)});}
}
function localQueuePublicState(){
  return {
    count:localAudioQueue.length,
    index:localAudioQueueIndex,
    current:localAudioQueueIndex>=0?path.basename(localAudioQueue[localAudioQueueIndex]):'',
    items:localAudioQueue.map((p,i)=>({index:i,name:path.basename(p),active:i===localAudioQueueIndex})),
    mediaUrl:selectedLocalAudioPath?('swmedia://audio/current?v='+localAudioRevision):''
  };
}
function addLocalQueuePaths(paths,{replace=false}={}){
  const incoming=(Array.isArray(paths)?paths:[]).map(validLocalAudioPath).filter(Boolean);
  if(!incoming.length)return localQueuePublicState();
  const previous=selectedLocalAudioPath;
  const base=replace?[]:localAudioQueue.slice();
  const seen=new Set(base.map(x=>x.toLowerCase()));
  for(const p of incoming){
    if(base.length>=500)break;
    if(seen.has(p.toLowerCase()))continue;
    seen.add(p.toLowerCase());base.push(p);
  }
  localAudioQueue=base;
  if(localAudioQueueIndex<0&&base.length)localAudioQueueIndex=0;
  if(localAudioQueueIndex>=base.length)localAudioQueueIndex=Math.max(0,base.length-1);
  selectedLocalAudioPath=localAudioQueueIndex>=0?base[localAudioQueueIndex]:'';
  if(selectedLocalAudioPath!==previous)localAudioRevision++;
  persistLocalQueue();
  runtimeEvent('local-queue-updated',{count:base.length,index:localAudioQueueIndex,replace});
  return localQueuePublicState();
}
function activateLocalQueueIndex(index){
  if(!localAudioQueue.length)throw new Error('local_queue_empty');
  const n=Math.max(0,Math.min(localAudioQueue.length-1,Number(index)||0));
  localAudioQueueIndex=n;
  selectedLocalAudioPath=localAudioQueue[n];
  localAudioRevision++;
  persistLocalQueue();
  const state=localQueuePublicState();
  broadcastSourceState({mode:'local',src:state.mediaUrl,name:state.current,queueIndex:n,queueLength:state.count});
  runtimeEvent('local-queue-activate',{index:n,name:state.current});
  return state;
}

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
const audioPermissionGate=createAudioPermissionGate({getMainWindow:()=>mainWindow,isTrustedUrl:trustedAppUrl});
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
async function protectedPost(route,payload){ const gate=await authCheck(); if(!gate.ok) throw new Error(gate.error||'auth_required'); const r=await radioJson(route,{method:'POST',headers:{origin:radioOrigin},body:JSON.stringify(payload||{})},true); if(!r.ok||r.data?.ok!==true) throw new Error(r.data?.error||`HTTP_${r.status}`); return r.data; }
async function lock(name,fn){ if(remoteLocks.has(name)) return {ok:false,busy:true,reason:'request_in_flight'}; remoteLocks.add(name); try{return await fn();}finally{remoteLocks.delete(name);} }
function textValue(v,max,code){ if(typeof v!=='string'||!v.trim()||v.trim().length>max) throw new Error(code); return v.trim(); }

const adminConfigRoutes=Object.freeze({current:'/api/admin/config/current',backups:'/api/admin/config/backups',update:'/api/admin/config/update',rollback:'/api/admin/config/rollback'});
const adminConfigScalars=['primaryStream','backupStream','emergencyStream'];
const adminConfigLists=['primaryStreams','backupStreams','emergencyStreams','metadataUpstreams'];
function adminConfigUrl(value){
  if(typeof value!=='string'||value.length>2048)throw new Error('invalid_stream_url');
  const trimmed=value.trim();if(!trimmed)return '';
  let url;try{url=new URL(trimmed);}catch{throw new Error('invalid_stream_url');}
  if(!['http:','https:'].includes(url.protocol))throw new Error('invalid_stream_url');
  return trimmed;
}
function validateAdminConfig(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('invalid_config');
  const allowed=new Set([...adminConfigScalars,...adminConfigLists,'note']),out={};
  if(Object.keys(payload).some(key=>!allowed.has(key)))throw new Error('invalid_config_field');
  for(const key of adminConfigScalars)if(Object.hasOwn(payload,key))out[key]=adminConfigUrl(payload[key]);
  for(const key of adminConfigLists)if(Object.hasOwn(payload,key)){
    if(!Array.isArray(payload[key])||payload[key].length>12)throw new Error('invalid_config_list');
    out[key]=payload[key].map(adminConfigUrl);
    if(out[key].some(value=>!value))throw new Error('invalid_config_list');
  }
  if(!Object.keys(out).length)throw new Error('no_config_changes');
  if(payload.note!==undefined){if(typeof payload.note!=='string'||payload.note.length>300)throw new Error('invalid_config_note');out.note=payload.note.trim();}
  return out;
}
function configFieldSummary(value){
  const list=Array.isArray(value)?value:(typeof value==='string'&&value.trim()?[value]:[]);
  const origins=list.map(item=>{try{const u=new URL(String(item));return ['http:','https:'].includes(u.protocol)?u.origin:'invalid URL';}catch{return 'invalid URL';}});
  return {configured:list.length>0,count:list.length,origins:[...new Set(origins)]};
}
function adminConfigError(r,secret=adminToken){
  const code=typeof r.data?.error==='string'&&/^[a-z0-9_]{1,80}$/i.test(r.data.error)&&(!secret||!r.data.error.includes(secret))?r.data.error:'request_failed';
  return new Error(`${code} (HTTP ${r.status})`);
}
async function adminConfigGate(){
  const secret=adminToken,gate=await authCheck();
  if(!gate.ok){const code=typeof gate.error==='string'&&/^[a-z0-9_]{1,80}$/i.test(gate.error)&&(!secret||!gate.error.includes(secret))?gate.error:'auth_required';throw new Error(code);}
}
async function adminConfigRead(route){
  await adminConfigGate();
  const secret=adminToken;
  const r=await radioJson(route,{method:'GET',headers:{origin:radioOrigin}},true);
  if(!r.ok||r.data?.ok!==true)throw adminConfigError(r,secret);
  return r.data;
}
async function adminConfigWrite(route,payload,label){
  return lock('admin-config',async()=>{
    const body=route===adminConfigRoutes.update?validateAdminConfig(payload):{};
    await adminConfigGate();
    const confirmedSession=adminToken;
    const fields=Object.keys(body).join(', ');
    const choice=await dialog.showMessageBox(mainWindow,{type:'warning',title:'Confirm production radio change',message:label,detail:(fields?'Fields: '+fields+'\n':'')+'This can commit to GitHub and change the live radio configuration. Backups may be created even if the operation fails.',buttons:['CANCEL','CONFIRM'],defaultId:0,cancelId:0,noLink:true});
    if(choice.response!==1)return {ok:false,cancelled:true};
    if(adminToken!==confirmedSession)throw new Error('auth_session_changed');
    await adminConfigGate();if(adminToken!==confirmedSession)throw new Error('auth_session_changed');
    const r=await radioJson(route,{method:'POST',headers:{origin:radioOrigin},body:JSON.stringify(body)},true);
    if(!r.ok||r.data?.ok!==true)throw adminConfigError(r,confirmedSession);
    return {ok:true,effectiveImmediately:r.data.effectiveImmediately===true,deploymentPending:r.data.deploymentPending===true,version:Number.isFinite(r.data.version)?r.data.version:null};
  });
}
const radioProbeDefs=Object.freeze({
  'password-health':{url:'https://666-system-pw.666soundsdesign-broadcaster.com/health',kind:'health'},
  'auth-health':{url:'https://666-system-auth.666soundsdesign-broadcaster.com/health',kind:'health'},
  'auth-debug':{url:'https://666-system-auth.666soundsdesign-broadcaster.com/debug',kind:'auth-debug',tokenEnv:'RADIO_WAVE_AUTH_DEBUG_TOKEN'},
  'admin-debug':{url:new URL('/api/admin/debug',radioCfg.radioBase).href,kind:'admin-debug',admin:true},
  'radio-debug':{url:new URL('/debug',radioCfg.radioBase).href,kind:'radio-debug',tokenEnv:'RADIO_WAVE_RADIO_DEBUG_TOKEN'},
  'discord-status':{url:new URL('/api/discord/status',radioCfg.radioBase).href,kind:'discord-status',admin:true}
});
async function radioAdminProbe(name){
  if(typeof name!=='string'||!Object.hasOwn(radioProbeDefs,name))throw new Error('probe_not_supported');
  const def=radioProbeDefs[name];await adminConfigGate();const sessionToken=adminToken;
  const headers={accept:'application/json'};
  if(def.admin){headers.origin=radioOrigin;headers.authorization=`Bearer ${sessionToken}`;}
  let debugToken='';
  if(def.tokenEnv){debugToken=String(process.env[def.tokenEnv]||'').trim();if(!debugToken)throw new Error('debug_authorization_not_configured');headers['x-debug-token']=debugToken;}
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),radioCfg.requestTimeoutMs);
  try{
    const r=await fetch(def.url,{method:'GET',headers,cache:'no-store',redirect:'error',signal:ctl.signal});
    if(!r.ok){if(def.tokenEnv&&[401,403,404].includes(r.status))throw new Error('debug_authorization_unavailable');if(def.kind==='admin-debug'&&r.status===404)throw new Error('admin_debug_unavailable_or_unauthorized');throw new Error(`probe_http_${r.status}`);}
    const text=await r.text();if(Buffer.byteLength(text,'utf8')>262144)throw new Error('probe_response_too_large');
    let data;try{data=JSON.parse(text);}catch{throw new Error('probe_invalid_response');}
    if(data?.ok!==true)throw new Error('probe_rejected');
    const out={ok:true};
    for(const key of ['ready','webhook2Configured','privateTrackWebhookConfigured','githubConfigured','authVerifyConfigured','pwLoginConfigured','runtimeKvConfigured','skipConfigured','authSecretConfigured','serviceTokenConfigured']){
      if(typeof data[key]==='boolean')out[key]=data[key];
    }
    if(Number.isSafeInteger(data.webhookCount)&&data.webhookCount>=0)out.webhookCount=data.webhookCount;
    for(const key of ['worker','version','role','status','authMode'])if(typeof data[key]==='string'&&/^[\w.-]{1,80}$/.test(data[key])&&(!sessionToken||!data[key].includes(sessionToken))&&(!debugToken||!data[key].includes(debugToken)))out[key]=data[key];
    return out;
  }catch(e){if(e?.name==='AbortError')throw new Error('probe_timeout');if(/^probe_[a-z0-9_]+$|^debug_authorization_unavailable$|^admin_debug_unavailable_or_unauthorized$/.test(String(e?.message||'')))throw e;throw new Error('probe_unavailable');}
  finally{clearTimeout(timer);}
}
async function radioAdminTestMessage(kind){
  if(!['discord','broadcast'].includes(kind))throw new Error('test_not_supported');
  return lock('radio-test-message',async()=>{
    await adminConfigGate();const confirmedSession=adminToken;
    const choice=await dialog.showMessageBox(mainWindow,{type:'warning',title:'Confirm real test message',message:kind==='discord'?'Send a real Discord test message?':'Send a real broadcast message to players?',detail:'This sends a real message to the production service.',buttons:['CANCEL','SEND TEST'],defaultId:0,cancelId:0,noLink:true});
    if(choice.response!==1)return {ok:false,cancelled:true};
    if(adminToken!==confirmedSession)throw new Error('auth_session_changed');
    await adminConfigGate();if(adminToken!==confirmedSession)throw new Error('auth_session_changed');
    const stamp=new Date(),id='admin-overlay-'+stamp.getTime();
    const payload=kind==='discord'?{message:'Admin Discord test '+stamp.toLocaleString(),source:'admin-overlay-test'}:{message:'Admin broadcast test '+stamp.toLocaleString(),clientId:id,senderId:id,version:'admin-final-integration'};
    const headers=kind==='discord'?{origin:radioOrigin}:{origin:radioOrigin,referer:radioCfg.radioBase+'/'};
    const r=await radioJson(kind==='discord'?'/api/discord/test':radioCfg.playerAlertSendRoute,{method:'POST',headers,body:JSON.stringify(payload),redirect:'error'},kind==='discord');
    if(!r.ok||r.data?.ok!==true)throw adminConfigError(r,confirmedSession);
    const source=['backend','kv-fallback','cache-tertiary','durable-object-fallback','render-backend'].includes(r.data.source)?r.data.source:'unknown';
    return {ok:true,partial:r.data.partial===true,skipped:r.data.skipped===true,source};
  });
}

async function soundCloudCredentials(){
  await soundCloudCredentialWrite;
  const saved=await soundCloudCredentialStore.read();
  const clientId=saved?.clientId||String(process.env.SOUNDCLOUD_CLIENT_ID||'').trim();
  const clientSecret=saved?.clientSecret||String(process.env.SOUNDCLOUD_CLIENT_SECRET||'').trim();
  return {clientId,clientSecret,configured:!!(clientId&&clientSecret),source:saved?'stored':(clientId&&clientSecret?'environment':'none')};
}
function updateSoundCloudCredentials(action){
  soundCloudCredentialRevision++;
  soundCloudToken=null;
  soundCloudStreamProxy.reset();
  const operation=soundCloudCredentialWrite.then(action);
  soundCloudCredentialWrite=operation.then(()=>undefined,()=>undefined);
  return operation;
}
async function soundCloudAccessToken(){
  const revision=soundCloudCredentialRevision;
  const c=await soundCloudCredentials();
  if(revision!==soundCloudCredentialRevision) throw new Error('soundcloud_credentials_changed');
  if(!c.configured) throw new Error('soundcloud_credentials_missing');
  const now=Date.now(); if(soundCloudToken&&soundCloudToken.expiresAt>now+60000)return soundCloudToken.accessToken;
  if(soundCloudTokenRequest?.revision===revision)return soundCloudTokenRequest.promise;
  const pending={revision,promise:null};
  pending.promise=(async()=>{
    let body,headers={accept:'application/json','content-type':'application/x-www-form-urlencoded'};
    if(soundCloudToken?.refreshToken){body=new URLSearchParams({grant_type:'refresh_token',client_id:c.clientId,client_secret:c.clientSecret,refresh_token:soundCloudToken.refreshToken});}
    else {headers.authorization=`Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString('base64')}`;body=new URLSearchParams({grant_type:'client_credentials'});}
    const r=await soundCloudFetch(`${SOUND_CLOUD_AUTH}/oauth/token`,{method:'POST',headers,body,cache:'no-store',redirect:'error'});
    const data=await r.json().catch(()=>({}));
    if(revision!==soundCloudCredentialRevision) throw new Error('soundcloud_credentials_changed');
    if(!r.ok||!data.access_token){soundCloudToken=null;throw new Error(r.ok?'soundcloud_token_invalid_response':`soundcloud_token_HTTP_${r.status}`);}
    soundCloudToken={accessToken:String(data.access_token),refreshToken:String(data.refresh_token||''),expiresAt:Date.now()+Math.max(60,Number(data.expires_in)||3600)*1000};
    return soundCloudToken.accessToken;
  })();
  soundCloudTokenRequest=pending;
  try{return await pending.promise;}finally{if(soundCloudTokenRequest===pending)soundCloudTokenRequest=null;}
}
function soundCloudPermalink(value){
  let u; try{u=new URL(String(value||'').trim());}catch{throw new Error('soundcloud_url_invalid');}
  if(!/(^|\.)soundcloud\.com$/i.test(u.hostname))throw new Error('soundcloud_url_invalid'); return u.href;
}
async function soundCloudFetch(url,opts={}){const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),15000);try{return await fetch(url,{...opts,signal:ctl.signal,cache:'no-store'});}catch(e){if(e?.name==='AbortError')throw new Error('soundcloud_timeout');throw e;}finally{clearTimeout(timer);}}
async function soundCloudApi(pathname){
  let token=await soundCloudAccessToken(); let r=await soundCloudFetch(`${SOUND_CLOUD_API}${pathname}`,{headers:{accept:'application/json',authorization:`OAuth ${token}`}});
  if(r.status===401){if(soundCloudToken?.accessToken===token)soundCloudToken.expiresAt=0;token=await soundCloudAccessToken();r=await soundCloudFetch(`${SOUND_CLOUD_API}${pathname}`,{headers:{accept:'application/json',authorization:`OAuth ${token}`}});}
  if(r.ok&&pathname.endsWith('/streams')&&!/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(r.headers.get('content-type')||''))throw new Error('soundcloud_stream_invalid_content_type');
  const data=await r.json().catch(()=>({})); if(!r.ok)throw new Error(`soundcloud_HTTP_${r.status}`); return data;
}
function normalizeSoundCloudTrack(track,fallback){
  if(!track||track.access==='blocked')return null;
  const urn=String(track.urn||'').trim(); const id=String(track.id||urn.split(':').pop()||'').trim(); if(!urn&&!id)return null;
  return {urn:urn||`soundcloud:tracks:${id}`,id,permalink:track.permalink_url||fallback,title:track.title||'SoundCloud',artist:track.metadata_artist||track.user?.username||'SoundCloud',artwork:track.artwork_url||track.user?.avatar_url||'',access:track.access||'playable'};
}
const soundCloudStreamProxy=createSoundCloudStreamProxy({
  fetch:soundCloudFetch,
  accessToken:soundCloudAccessToken,
  invalidateToken:token=>{if(soundCloudToken?.accessToken===token)soundCloudToken.expiresAt=0;}
});
async function activateSoundCloudIndex(index){
  if(!soundCloudQueue.length)throw new Error('soundcloud_queue_empty');
  const n=((Number(index)||0)%soundCloudQueue.length+soundCloudQueue.length)%soundCloudQueue.length;
  soundCloudQueueIndex=n; soundCloudCurrent=soundCloudQueue[n]; soundCloudRevision++;
  const revision=soundCloudRevision, credentialRevision=soundCloudCredentialRevision, current=soundCloudCurrent;
  soundCloudStreamProxy.reset();
  const streams=await soundCloudApi(`/tracks/${encodeURIComponent(soundCloudCurrent.urn||soundCloudCurrent.id)}/streams`);
  if(revision!==soundCloudRevision||credentialRevision!==soundCloudCredentialRevision||current!==soundCloudCurrent||sharedSourceState.mode!=='soundcloud')throw new Error('soundcloud_track_changed');
  const playback=soundCloudStreamProxy.prepare(streams,current.access,revision);
  const mediaUrl=`swsc://audio/current?v=${soundCloudRevision}`;
  const state={mode:'soundcloud',src:mediaUrl,name:soundCloudCurrent.title,artist:soundCloudCurrent.artist,permalink:soundCloudCurrent.permalink,artwork:soundCloudCurrent.artwork,queueIndex:n,queueLength:soundCloudQueue.length}; broadcastSourceState(state);
  return {...soundCloudCurrent,mediaUrl,playbackKind:playback.kind,preview:playback.preview,queueIndex:n,queueLength:soundCloudQueue.length};
}
async function resolveSoundCloud(permalink){
  const href=soundCloudPermalink(permalink), revision=++soundCloudRevision;
  soundCloudStreamProxy.reset();
  const resource=await soundCloudApi(`/resolve?url=${encodeURIComponent(href)}`);
  if(revision!==soundCloudRevision)throw new Error('soundcloud_track_changed');
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

const DETACHED_OVERLAY_KEYS=new Set(['source','radioAdmin','media','audioPool','audioFx','audioDevices','wave','position','text','engines','milkdrop','vjStudio','diagnostics','export','dock']);
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
    if(intersects){
      const rect={x:Math.round(base.x),y:Math.round(base.y),width:Math.max(1,Math.round(base.width)),height:Math.max(1,Math.round(base.height))};
      const wa=screen.getDisplayMatching(rect).workArea;
      const width=Math.min(Math.max(320,rect.width),Math.max(320,wa.width));
      const height=Math.min(Math.max(220,rect.height),Math.max(220,wa.height));
      return {x:Math.max(wa.x,Math.min(rect.x,wa.x+wa.width-width)),y:Math.max(wa.y,Math.min(rect.y,wa.y+wa.height-height)),width,height};
    }
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
function reconcileDetachedWindows(){
  const displays=screen.getAllDisplays();
  const visible=b=>displays.some(d=>{
    const a=d.workArea;
    const width=Math.max(0,Math.min(b.x+b.width,a.x+a.width)-Math.max(b.x,a.x));
    const header=Math.max(0,Math.min(b.y+Math.min(40,b.height),a.y+a.height)-Math.max(b.y,a.y));
    return width>=Math.min(80,b.width)&&header>=Math.min(24,b.height);
  });
  for(const [key,w] of detachedOverlayWindows){
    if(w&&!w.isDestroyed()&&!visible(w.getBounds()))w.setBounds(overlayBoundsFor(key,w.getBounds()));
  }
  if(detachedVisualizerWindow&&!detachedVisualizerWindow.isDestroyed()&&!visible(detachedVisualizerWindow.getBounds())){
    detachedVisualizerWindow.setBounds(overlayBoundsFor('visualizerNative',detachedVisualizerWindow.getBounds()));
  }
}
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
  const base=overlayBoundsFor('visualizerNative',{width:1100,height:720});
  const b={...base,width:Math.max(480,base.width),height:Math.max(300,base.height)};
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
function boundsIntersectAnyDisplay(b){
  if(!b)return false;
  return screen.getAllDisplays().some(d=>b.x+b.width>d.workArea.x&&b.x<d.workArea.x+d.workArea.width&&b.y+b.height>d.workArea.y&&b.y<d.workArea.y+d.workArea.height);
}
function reconcileDetachedWindows(){
  for(const [key,w] of detachedOverlayWindows){
    if(!w||w.isDestroyed())continue;
    const b=w.getBounds();
    if(!boundsIntersectAnyDisplay(b)){
      try{w.setBounds(overlayBoundsFor(key,b),false);saveDetachedOverlayWindow(key,w,true);}catch{}
    }
  }
  if(detachedVisualizerWindow&&!detachedVisualizerWindow.isDestroyed()){
    const b=detachedVisualizerWindow.getBounds();
    if(!boundsIntersectAnyDisplay(b)){
      const next=overlayBoundsFor('visualizerNative',b);
      try{detachedVisualizerWindow.setBounds({...next,width:Math.max(480,next.width),height:Math.max(300,next.height)},false);}catch{}
    }
  }
}
function reconcileOutputWindows(){ const all=screen.getAllDisplays(); const valid=new Map(all.map(d=>[d.id,d])); for(const [id,w] of outputWindows){ const d=valid.get(id); if(!d){try{w.close();}catch{} outputWindows.delete(id); continue;} if(w&&!w.isDestroyed()){const b=d.bounds; try{w.setBounds({x:b.x,y:b.y,width:b.width,height:b.height},false); if(!w.isFullScreen())w.setFullScreen(true);}catch{}} } reconcileDetachedWindows(); return outputStatus(); }



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
    discardVideoWrite();
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
registerIpc('workspace:overlay-close','main',(_e,key)=>{const w=detachedOverlayWindows.get(String(key||''));if(w&&!w.isDestroyed()){w.close();return {ok:true};}return {ok:false};});
registerIpc('app:version','main',()=>app.getVersion());
registerIpc('dialog:openVjData','main',async(_event,kind)=>{
  if(kind!=='sync'&&kind!=='parity')throw new Error('Invalid VJ data type');
  const result=await dialog.showOpenDialog(mainWindow,{
    title:kind==='sync'?'Open VJ audio sync CSV':'Open VJ parity JSON',
    properties:kind==='parity'?['openFile','multiSelections']:['openFile'],
    filters:[{name:kind==='sync'?'CSV audio sync':'Parity JSON',extensions:[kind==='sync'?'csv':'json']}]
  });
  if(result.canceled||!result.filePaths?.length)return null;
  return readVjDataFiles(result.filePaths,kind);
});
registerIpc('app:open-site','main',async(_e,key)=>{
  if(typeof key!=='string'||!Object.hasOwn(approvedWebsites,key))throw new Error('website_not_allowed');
  await shell.openExternal(approvedWebsites[key]);
  return {ok:true};
});
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
registerIpc('audio:overlay-microphone','overlay',event=>forwardOverlayMicrophone(event,{
  getMainWindow:()=>mainWindow,
  getDevicesWindow:()=>detachedOverlayWindows.get('audioDevices'),
  isTrustedOverlayUrl:trustedOverlayUrl
}));
registerIpc('workspace:overlay-action','overlay',(_e,payload={})=>{
  if(!mainWindow||mainWindow.isDestroyed())return {ok:false};
  const key=String(payload.key||'');
  if(!DETACHED_OVERLAY_KEYS.has(key))throw new Error('overlay_key_invalid');
  const kind=String(payload.kind||'');
  if(!['input','change','click','toggle'].includes(kind))throw new Error('overlay_action_invalid');
  const id=String(payload.id||'').slice(0,120);
  const selector=String(payload.selector||'').slice(0,180);
  if(kind==='toggle'&&(!id||selector))throw new Error('overlay_control_invalid');
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
registerIpc('vj:sync','main',(_e,state)=>{broadcastVjState(validateVjState(state,id=>vjFiles.has(id)));return {ok:true};});
registerIpc('vj:state','output',()=>vjFollowerState);
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
registerIpc('runtime:remote-health','main', async()=>{
  const health={generatedAt:new Date().toISOString(),radioBase:radioCfg.radioBase};
  try{health.soundcloud=(await soundCloudCredentials()).configured?'CONFIGURED':'CREDENTIALS_MISSING';}
  catch(e){health.soundcloud='ERROR';health.soundcloudError=String(e.message||e);}
  try{
    const p=await radioJson(radioCfg.playerAlertStatusRoute);
    health.messenger={ok:p.ok,status:p.status,error:p.data?.error||null};
  }catch(e){health.messenger={ok:false,status:0,error:String(e.message||e)};}
  try{
    const s=await radioJson('/api/skip/status');
    health.skip={ok:s.ok,status:s.status,configured:s.data?.configured===true,error:s.data?.error||null};
  }catch(e){health.skip={ok:false,status:0,error:String(e.message||e)};}
  try{
    const a=await authCheck();
    health.admin={ok:a.ok,error:a.error||null};
  }catch(e){health.admin={ok:false,error:String(e.message||e)};}
  return health;
});
registerIpc('runtime:diagnostics','main', async()=>runtimeDiagnostics());
let launchCyberStudio;
registerIpc('milkdrop:open-cyber-studio','main',async(_e, language)=>{
  const dataRoot=path.join(app.getPath('userData'),'milkdrop-cyber-studio');
  try {
    launchCyberStudio ??= createCyberStudioLauncher({
      studioRoot:app.isPackaged?path.join(process.resourcesPath,'cyber-studio'):path.join(__dirname,'build','cyber-studio'),
      dataRoot
    });
    return {ok:true,...await launchCyberStudio()};
  } catch(error) {
    const de=String(language).toLowerCase().startsWith('de');
    const message=error.message==='studio_binary_missing'
      ? (de?'Die gebündelte Studio-Anwendung fehlt.':'The bundled Studio application is missing.')
      : error.message==='windows_required'
        ? (de?'Das Studio benötigt Windows.':'The Studio requires Windows.')
        : error.message==='studio_start_timeout'
          ? (de?'Studio ist noch nicht bereit. Bitte ein eventuell geöffnetes Studio schließen.':'Studio is not ready yet. Close any Studio window before retrying.')
          : (de?'Studio konnte nicht gestartet werden.':'Could not start Studio.');
    startupLog('CYBER_STUDIO_START_FAILED',error.message);
    await dialog.showMessageBox(mainWindow,{type:'error',title:'MilkDrop Cyber Studio',message,detail:path.join(dataRoot,'logs','RADIO_WAVE_STUDIO_START.log')});
    return {ok:false};
  }
});
registerIpc('runtime:export-diagnostics','main', async()=>{const report=runtimeDiagnostics();const stamp=new Date().toISOString().replace(/[:.]/g,'-');const r=await dialog.showSaveDialog(mainWindow,{title:'Export RADIO WAVE v6.66 Diagnostics',defaultPath:`RADIO-WAVE-v6.66-diagnostics-${stamp}.json`,filters:[{name:'JSON diagnostics',extensions:['json']}]});if(r.canceled||!r.filePath)return {ok:false,canceled:true};fs.writeFileSync(r.filePath,JSON.stringify(report,null,2),'utf8');return {ok:true,filePath:r.filePath};});
registerIpc('source:sync','main', (_e, state) => broadcastSourceState(state));
registerIpc('window:fullscreen','main', (_e, enabled) => { if(mainWindow&&!mainWindow.isDestroyed()) mainWindow.setFullScreen(!!enabled); return {ok:true,fullscreen:!!enabled}; });
registerIpc('soundcloud:status','main',async()=>{const c=await soundCloudCredentials();return {configured:c.configured,source:c.source,stored:soundCloudCredentialStore.stored(),encryptionAvailable:await safeStorage.isAsyncEncryptionAvailable(),creatorUrl:SOUND_CLOUD_CREATOR_URL};});
registerIpc('soundcloud:credentials-save','main',async(_e,credentials)=>{
  await updateSoundCloudCredentials(()=>soundCloudCredentialStore.save(credentials));
  return {ok:true};
});
registerIpc('soundcloud:credentials-clear','main',async()=>{
  await updateSoundCloudCredentials(()=>soundCloudCredentialStore.clear());
  return {ok:true};
});
registerIpc('soundcloud:credentials-test','main',async()=>{
  await soundCloudApi(`/resolve?url=${encodeURIComponent(SOUND_CLOUD_CREATOR_URL)}`);
  return {ok:true};
});
registerIpc('soundcloud:library','main',()=>soundCloudCreatorLibrary());
registerIpc('soundcloud:resolve','main',(_e,url)=>resolveSoundCloud(url));
registerIpc('soundcloud:next','main',()=>soundCloudStep(1));
registerIpc('soundcloud:previous','main',()=>soundCloudStep(-1));
registerIpc('soundcloud:queue-state','main',()=>soundCloudQueueState());
registerIpc('soundcloud:open-current','main',async()=>{if(!soundCloudCurrent?.permalink)throw new Error('soundcloud_track_missing');await shell.openExternal(soundCloudPermalink(soundCloudCurrent.permalink));return {ok:true};});
registerIpc('radio:config','main', () => ({stream:new URL(radioCfg.stream,radioCfg.radioBase).href,fallback:new URL(radioCfg.fallbackStream,radioCfg.radioBase).href,radioBase:radioCfg.radioBase}));
registerIpc('radio:nowplaying','main', async()=>{const r=await radioJson(radioCfg.nowPlaying);if(!r.ok)throw new Error(`HTTP_${r.status}`);return r.data;});
registerIpc('auth:login','main', async(_e,password)=>{const value=textValue(password,512,'password_invalid');adminToken='';const r=await radioJson(radioCfg.loginRoute,{method:'POST',headers:{origin:radioOrigin},body:JSON.stringify({password:value})});if(!r.ok||r.data?.ok!==true||!r.data?.token)throw new Error(r.data?.error||'login_rejected');adminToken=String(r.data.token);const gate=await authCheck();if(!gate.ok){adminToken='';throw new Error(gate.error||'gate_check_failed');}return gate;});
registerIpc('auth:check','main',()=>authCheck());
registerIpc('auth:logout','main',()=>{adminToken='';return {ok:true};});
registerIpc('radio:admin-config-current','main',async()=>{const r=await adminConfigRead(adminConfigRoutes.current);if(!r.config||typeof r.config!=='object'||Array.isArray(r.config))throw new Error('invalid_config_response');const config=r.config,fields={};for(const key of [...adminConfigScalars,...adminConfigLists])fields[key]=configFieldSummary(config[key]);return {ok:true,version:Number.isFinite(config.version)?config.version:null,fields};});
registerIpc('radio:admin-config-backups','main',async()=>{const r=await adminConfigRead(adminConfigRoutes.backups);if(!Array.isArray(r.items))throw new Error('invalid_backups_response');return {ok:true,items:r.items.slice(0,100).map(item=>({name:typeof item?.name==='string'&&/^[\w.-]{1,180}$/.test(item.name)?item.name:'unavailable',size:Number.isFinite(item?.size)?item.size:null}))};});
registerIpc('radio:admin-config-active','main',async()=>{const r=await adminConfigRead('/api/runtime-config/status');const fields={};for(const key of adminConfigScalars)fields[key]=configFieldSummary(r[key]);return {ok:true,source:typeof r.source==='string'&&/^[\w.-]{1,60}$/.test(r.source)?r.source:'unknown',version:Number.isFinite(r.version)?r.version:null,fields,metadataUpstreamCount:Number.isFinite(r.metadataUpstreamCount)?r.metadataUpstreamCount:null};});
registerIpc('radio:admin-config-update','main',(_e,payload)=>adminConfigWrite(adminConfigRoutes.update,payload,'Update radio stream configuration?'));
registerIpc('radio:admin-config-rollback','main',()=>adminConfigWrite(adminConfigRoutes.rollback,{},'Restore the latest radio configuration backup?'));
registerIpc('radio:admin-probe','main',(_e,name)=>radioAdminProbe(name));
registerIpc('radio:admin-test-message','main',(_e,kind)=>radioAdminTestMessage(kind));
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
  ses.setPermissionCheckHandler((wc,permission,origin,details)=>audioPermissionGate.check(wc,permission,origin,details));
  ses.setPermissionRequestHandler((wc,permission,cb,details)=>cb(audioPermissionGate.request(wc,permission,details)));
  protocol.handle('swsc', request=>soundCloudStreamProxy.handle(request));
  protocol.handle('swvj', request=>vjFiles.handle(request));
  loadLocalQueueFromDisk();
  audioLibrary=createAudioLibrary({
    userData:app.getPath('userData'),
    onChange:state=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('local:library-changed',state);}
  });
  audioLibrary.refresh().catch(error=>runtimeEvent('local-library-scan-error',{error:String(error.message||error)}));
  audioLibraryTimer=setInterval(()=>audioLibrary.refresh().catch(error=>runtimeEvent('local-library-scan-error',{error:String(error.message||error)})),30000);
  protocol.handle('swmedia', (request) => {
    const u = new URL(request.url);
    if (u.hostname !== 'audio' || u.pathname !== '/current' || u.search !== '?v='+localAudioRevision || !selectedLocalAudioPath) return new Response('Not found', {status:404});
    return net.fetch(pathToFileURL(selectedLocalAudioPath).toString(), {headers: request.headers});
  });
  const displayChanged=()=>{
    reconcileOutputWindows();
    reconcileDetachedWindows();
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
    }
  });
}).catch(error=>{
  fatalStartup('APP_READY_CHAIN_FAILED',error);
  try{app.exit(1);}catch{}
});

app.on('before-quit',()=>{appQuitting=true;startupLog('APP_BEFORE_QUIT');destroyIntroWindow();if(outputWatchdog){clearInterval(outputWatchdog);outputWatchdog=null;} if(audioLibraryTimer)clearInterval(audioLibraryTimer); discardVideoWrite(); adminToken=''; soundCloudToken=null; runtimeEvent('app-before-quit');});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for Native Dialogs and File operations
registerIpc('vj:choose-videos','main',async()=>{
  if(vjPickerOpen)throw new Error('Video picker is already open.');
  vjPickerOpen=true;
  try{
    const result=await dialog.showOpenDialog(mainWindow,{title:'Choose Local VJ Videos',filters:[{name:'MP4 and WebM videos',extensions:['mp4','webm']}],properties:['openFile','multiSelections']});
    if(result.canceled||!result.filePaths.length)return null;
    const items=vjFiles.replace(result.filePaths);
    broadcastVjState(null);
    return items;
  }finally{vjPickerOpen=false;}
});
registerIpc('vj:clear-videos','main',()=>{if(vjPickerOpen)throw new Error('Video picker is already open.');vjFiles.clear();broadcastVjState(null);return true;});
registerIpc('audio:permission-begin','main',(event,kind)=>{audioPermissionGate.arm(event,kind);return {ok:true};});
registerIpc('audio:permission-end','main',(_event,kind)=>{audioPermissionGate.revoke(kind);return {ok:true};});
registerIpc('dialog:openAudio','main', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Add Local Audio Files',
    filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg'] }],
    properties: ['openFile','multiSelections']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const state=addLocalQueuePaths(result.filePaths,{replace:false});
  if(state.count&&state.index>=0)return activateLocalQueueIndex(state.index);
  return state;
});
registerIpc('local:queue-state','main',async()=>localQueuePublicState());
registerIpc('local:queue-add-paths','main',async(_e,paths)=>addLocalQueuePaths(paths,{replace:false}));
registerIpc('local:queue-activate','main',async(_e,index)=>activateLocalQueueIndex(index));
registerIpc('local:queue-remove','main',async(_e,index)=>{
  const n=Number(index);
  if(!Number.isInteger(n)||n<0||n>=localAudioQueue.length)return localQueuePublicState();
  const wasCurrent=n===localAudioQueueIndex;
  localAudioQueue.splice(n,1);
  if(!localAudioQueue.length){localAudioQueueIndex=-1;selectedLocalAudioPath='';}
  else{
    if(n<localAudioQueueIndex)localAudioQueueIndex--;
    else if(wasCurrent)localAudioQueueIndex=Math.min(n,localAudioQueue.length-1);
    selectedLocalAudioPath=localAudioQueue[localAudioQueueIndex]||'';
  }
  if(wasCurrent)localAudioRevision++;
  persistLocalQueue();
  return localQueuePublicState();
});
registerIpc('local:queue-clear','main',async()=>{
  localAudioQueue=[];localAudioQueueIndex=-1;selectedLocalAudioPath='';localAudioRevision++;persistLocalQueue();
  if(sharedSourceState.mode==='local')broadcastSourceState({name:'',queueIndex:0,queueLength:0});
  return localQueuePublicState();
});
registerIpc('local:queue-shuffle','main',async()=>{
  if(localAudioQueue.length<2)return localQueuePublicState();
  const current=selectedLocalAudioPath;
  for(let i=localAudioQueue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[localAudioQueue[i],localAudioQueue[j]]=[localAudioQueue[j],localAudioQueue[i]];}
  localAudioQueueIndex=current?localAudioQueue.indexOf(current):0;
  if(localAudioQueueIndex<0)localAudioQueueIndex=0;
  selectedLocalAudioPath=localAudioQueue[localAudioQueueIndex]||'';
  persistLocalQueue();runtimeEvent('local-queue-shuffled',{count:localAudioQueue.length,index:localAudioQueueIndex});
  return localQueuePublicState();
});

registerIpc('local:library-state','main',()=>audioLibrary.state());
registerIpc('local:library-set-rating','main',(_e,id,rating)=>audioLibrary.setRating(id,rating));
registerIpc('local:library-refresh','main',async()=>{await audioLibrary.refresh();return audioLibrary.state();});
registerIpc('local:library-clear-folder','main',()=>audioLibrary.clearFolder());
registerIpc('local:library-choose-folder','main',async()=>{
  const result=await dialog.showOpenDialog(mainWindow,{title:'Choose Audio Pool Folder',properties:['openDirectory']});
  if(result.canceled||!result.filePaths[0])return null;
  return audioLibrary.selectFolder(result.filePaths[0]);
});
registerIpc('local:playlist-create','main',(_e,name)=>audioLibrary.create(name));
registerIpc('local:playlist-rename','main',(_e,id,name)=>audioLibrary.rename(id,name));
registerIpc('local:playlist-delete','main',(_e,id)=>audioLibrary.delete(id));
registerIpc('local:playlist-add-pool','main',(_e,id,tracks)=>audioLibrary.addPool(id,tracks));
registerIpc('local:playlist-add-files','main',async(_e,id)=>{
  const result=await dialog.showOpenDialog(mainWindow,{
    title:'Add Files to Playlist',
    filters:[{name:'Audio Files',extensions:['mp3','wav','m4a','flac','aac','ogg']}],
    properties:['openFile','multiSelections']
  });
  if(result.canceled||!result.filePaths.length)return null;
  return audioLibrary.addFiles(id,result.filePaths);
});
registerIpc('local:playlist-remove-track','main',(_e,id,track)=>audioLibrary.removeTrack(id,track));
registerIpc('local:playlist-add-queue','main',(_e,id)=>{
  const {paths,missing}=audioLibrary.playlistPaths(id);
  return {state:addLocalQueuePaths(paths),missing,available:paths.length};
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
  fs.rmSync(temp,{recursive:true,force:true});
  const MAX_ARCHIVE_ENTRIES=10000;
  const MAX_ARCHIVE_UNCOMPRESSED_BYTES=512*1024*1024;
  const escapedZip=String(zipPath).replace(/'/g,"''");
  const escapedDest=String(temp).replace(/'/g,"''");
  const script=`$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; $archive=[IO.Compression.ZipFile]::OpenRead('${escapedZip}'); try { $entryCount=0; [long]$totalBytes=0; foreach($entry in $archive.Entries) { $entryCount++; if($entryCount -gt ${MAX_ARCHIVE_ENTRIES}) { throw 'personal_library_archive_too_many_entries' }; $entryLength=[long]$entry.Length; if($entryLength -gt (${MAX_ARCHIVE_UNCOMPRESSED_BYTES} - $totalBytes)) { throw 'personal_library_archive_too_large' }; $totalBytes += $entryLength } } finally { $archive.Dispose() }; [IO.Compression.ZipFile]::ExtractToDirectory('${escapedZip}', '${escapedDest}')`;
  let installed=false;
  let importError=null;
  try{
    fs.mkdirSync(temp,{recursive:true});
    const r=runPowerShell(['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:4*1024*1024});
    if(r.status!==0)throw new Error('personal_library_extract_failed:'+String(r.stderr||r.stdout||'').slice(0,600));
    const files=safeWalkMilkdropLibrary(temp);
    const milk=files.filter(x=>x.ext==='.milk').length;
    const milk2=files.filter(x=>x.ext==='.milk2').length;
    if(milk<1)throw new Error('personal_library_no_milk_presets');
    fs.rmSync(root,{recursive:true,force:true});
    fs.renameSync(temp,root);
    installed=true;
    const state=personalMilkdropLibraryState(false);
    fs.writeFileSync(personalMilkdropManifestPath(),JSON.stringify({installedAt:new Date().toISOString(),sourceZip:path.basename(zipPath),milk:state.milk,milk2:state.milk2,count:state.count,personalUse:true,redistribution:false},null,2),'utf8');
    runtimeEvent('personal-milkdrop-library-imported',{milk:state.milk,milk2:state.milk2,count:state.count});
    return state;
  }catch(error){
    importError=error;
    throw error;
  }finally{
    if(!installed){
      try{fs.rmSync(temp,{recursive:true,force:true});}
      catch(cleanupError){
        const detail=String(cleanupError.message||cleanupError);
        const cleanupFailure=new Error('personal_library_staging_cleanup_failed:'+detail,{cause:cleanupError});
        if(importError)throw new Error(`${importError.message};${cleanupFailure.message}`,{cause:importError});
        throw cleanupFailure;
      }
    }
  }
}

registerIpc('dialog:openMilkdropPack','main', async()=>{
  const result=await dialog.showOpenDialog(mainWindow,{title:'Import MilkDrop Preset Folder',properties:['openDirectory']});
  if(result.canceled||!result.filePaths[0])return null;
  const root=path.resolve(result.filePaths[0]);
  const out=[]; let total=0;
  const MAX_FILES=1024, MAX_FILE=2*1024*1024, MAX_TOTAL=64*1024*1024;
  const persistRoot=path.join(personalMilkdropRoot(),'user-imports',path.basename(root).replace(/[^a-z0-9._-]+/gi,'_').slice(0,80)||'folder');
  fs.mkdirSync(persistRoot,{recursive:true});
  let persisted=0;
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
      const rel=path.relative(root,full);
      if(!rel||rel.startsWith('..')||path.isAbsolute(rel))continue;
      const target=path.resolve(persistRoot,rel);
      if(target!==persistRoot&&!target.startsWith(persistRoot+path.sep))continue;
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.copyFileSync(full,target);persisted++;
      total+=st.size;
      out.push({name:ent.name,relativePath:rel,source});
    }
  };
  walk(root);
  const state=personalMilkdropLibraryState(false);
  fs.writeFileSync(personalMilkdropManifestPath(),JSON.stringify({installedAt:new Date().toISOString(),sourceFolder:path.basename(root),milk:state.milk,milk2:state.milk2,count:state.count,personalUse:true,redistribution:false},null,2),'utf8');
  runtimeEvent('milkdrop-folder-persisted',{folder:path.basename(root),count:out.length,persisted,totalBytes:total});
  return {folder:path.basename(root),count:out.length,totalBytes:total,persisted,truncated:out.length>=MAX_FILES||total>=MAX_TOTAL,presets:out};
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

function discardVideoWrite() {
  const state = videoWriteState;
  if (!state || state.closing) return;
  state.aborted = true;
  void closeVideoWrite(state);
}

registerIpc('dialog:getSavePath','main', async (_event,formats) => {
  if (videoWriteState) throw new Error('video_write_in_progress');
  approvedSavePath = '';
  if(formats===undefined)formats=['mp4','webm'];
  if(!Array.isArray(formats)||!formats.length||formats.length>2||formats.some(format=>format!=='mp4'&&format!=='webm'))throw new Error('video_formats_invalid');
  const supported=[...new Set(formats)];
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Soundwave Video',
    defaultPath: path.join(app.getPath('videos'), `RADIO-WAVE-v6.66-visual.${supported[0]}`),
    filters: supported.map(format=>({name:format==='mp4'?'MP4 Video':'WebM Video',extensions:[format]}))
  });

  approvedSavePath = result.canceled || !result.filePath ? '' : path.resolve(result.filePath);
  return approvedSavePath || null;
});

registerIpc('file:startWrite','main', async (event, savePath) => {
  let state;
  try {
    const resolved = path.resolve(String(savePath || ''));
    if (!approvedSavePath || resolved !== approvedSavePath) throw new Error('save_path_not_approved');
    if (videoWriteState) throw new Error('video_write_in_progress');
    approvedSavePath = '';
    const temporaryPath = path.join(path.dirname(resolved), `.${path.basename(resolved)}.${require('crypto').randomBytes(12).toString('hex')}.partial`);
    const stream = fs.createWriteStream(temporaryPath, { flags: 'wx' });
    state = { stream, destination: resolved, temporaryPath, error: null, aborted: false, opened: false, closing: null };
    videoWriteState = state;
    fileWriteStream = stream;
    stream.on('error', error => { state.error ||= error; });
    await new Promise((resolve, reject) => {
      stream.once('open', () => { state.opened = true; resolve(); });
      stream.once('error', reject);
    });
    if (state.aborted || stream.destroyed) throw new Error('video_write_aborted');
    return { success: true };
  } catch (error) {
    if (state && videoWriteState === state && !state.opened) {
      videoWriteState = null;
      fileWriteStream = null;
    } else if (state && videoWriteState === state) {
      state.aborted = true;
      await closeVideoWrite(state);
    }
    console.error('Error starting file write:', error);
    return { success: false, error: error.message };
  }
});

registerIpc('file:writeChunk','main', async (event, chunkBuffer) => {
  const state = videoWriteState;
  if (!state || state.closing) return { success: false, error: 'Write stream not initialized' };
  try {
    const buffer = Buffer.from(chunkBuffer);
    if (!buffer.length) {
      state.aborted = true;
      return { success: true };
    }
    if (buffer.length > 8 * 1024 * 1024) throw new Error('write_chunk_too_large');
    if (state.error) throw state.error;
    if (state.aborted) throw new Error('video_write_aborted');
    await new Promise((resolve, reject) => state.stream.write(buffer, error => error ? reject(error) : resolve()));
    if (state.error) throw state.error;
    return { success: true };
  } catch (error) {
    state.error ||= error;
    return { success: false, error: error.message };
  }
});

async function closeVideoWrite(state) {
  if (state.closing) return state.closing;
  state.closing = (async () => {
    try {
      const stream = state.stream;
      const closed = stream.closed ? Promise.resolve() : new Promise(resolve => stream.once('close', resolve));
      if (state.aborted || state.error) stream.destroy();
      else stream.end();
      await closed;
      if (state.error) throw state.error;
      if (state.aborted) throw new Error('video_write_aborted');
      if (!stream.writableFinished) throw new Error('video_write_incomplete');
      await fs.promises.rename(state.temporaryPath, state.destination);
      return { success: true };
    } catch (error) {
      if (state.opened) {
        try { await fs.promises.unlink(state.temporaryPath); } catch (cleanupError) {
          if (cleanupError.code !== 'ENOENT') return { success: false, error: `${error.message}; partial file could not be removed: ${state.temporaryPath}` };
        }
      }
      return { success: false, error: error.message };
    } finally {
      if (videoWriteState === state) {
        fileWriteStream = null;
        videoWriteState = null;
      }
    }
  })();
  return state.closing;
}

registerIpc('file:close','main', async () => {
  const state = videoWriteState;
  if (!state) return { success: false, error: 'Write stream not initialized' };
  return closeVideoWrite(state);
});
