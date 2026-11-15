'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('src/integration/666-integration.js','utf8');
const html=fs.readFileSync('src/index.html','utf8');
const code=source.slice(source.indexOf('  async function refreshRemoteHealth(){'),source.indexOf("  q('#btn-fullscreen')"));

function harness(overrides={}){
  const elements=new Map(),calls=[];
  function q(selector){
    if(!elements.has(selector))elements.set(selector,{value:selector.startsWith('#radio-config-')&&selector.endsWith('-mode')?'keep':'',checked:false,textContent:'',addEventListener(type,fn){this[type]=fn;}});
    return elements.get(selector);
  }
  const api={
    remoteHealth:async()=>({admin:{ok:true},skip:{ok:true,configured:false},messenger:{ok:true}}),
    adminLogin:async password=>{calls.push(['login',password]);return {ok:true};},
    adminCheck:async()=>({ok:true}),
    adminLogout:async()=>{calls.push(['logout']);return {ok:true};},
    adminConfigCurrent:async()=>({ok:true,version:3,fields:{primaryStream:{configured:true,count:1,origins:['https://stream.example']}}}),
    adminConfigBackups:async()=>({ok:true,items:[{name:'latest.json',size:10}]}),
    adminConfigActive:async()=>({ok:true,version:2,source:'runtime-kv',fields:{},metadataUpstreamCount:1}),
    adminConfigUpdate:async payload=>{calls.push(['update',payload]);return {ok:true,deploymentPending:true};},
    adminConfigRollback:async()=>{calls.push(['rollback']);return {ok:false,cancelled:true};},
    adminProbe:async name=>{calls.push(['probe',name]);return {ok:true,ready:true};},
    adminTestMessage:async kind=>{calls.push(['test',kind]);return {ok:false,cancelled:true};},
    radioSkip:async()=>({ok:true}),
    playerAlertSend:async payload=>{calls.push(['player',payload]);return {ok:true};},
    playerAlertCurrent:async()=>({active:false}),
    playerAlertHistory:async()=>({items:[]}),
    discordMessage:async message=>{calls.push(['discord',message]);return {ok:true};},
    discordNowPlaying:async payload=>{calls.push(['nowplaying',payload]);return {ok:true};},...overrides
  };
  const context={window:{api},document:{hidden:false},q,qa:()=>[],URL,state:t=>q('#radio-action-state').textContent=t,setTimeout:()=>1,clearTimeout(){}};
  vm.createContext(context);
  vm.runInContext(`
    let mode='radio',np={title:'Test track',artist:'Test artist'},senderId='self',lastPlayerMessageId='',messengerPoll=0,discordAutoEnabled=false,lastDiscordTrack='',discordAutoCheckVersion=0,remoteHealthGeneration=0;
    function metadata(){return {title:np.title,artist:np.artist};}
    ${code}
    globalThis.hooks={refreshPlayerMessenger,getAuto:()=>discordAutoEnabled,setMode:value=>mode=value};
  `,context);
  return {q,calls,hooks:context.hooks};
}

test('admin section exposes named submenus without embedding an upstream admin page',()=>{
  assert.match(html,/id="rw-radio-admin"/);
  for(const id of ['rw-radio-auth','rw-radio-autodj','rw-radio-config','rw-radio-messenger','rw-radio-discord','rw-radio-nowplaying'])assert.ok(html.includes(`id="${id}"`));
  assert.doesNotMatch(html,/<iframe/i);
});

test('login clears the password and does not send an unsolicited now-playing message',async()=>{
  const h=harness();h.q('#radio-password').value='test-only-password';
  await h.q('#radio-login').onclick();
  assert.equal(h.q('#radio-password').value,'');
  assert.deepEqual(h.calls.map(x=>x[0]),['login']);
  assert.equal(h.hooks.getAuto(),false);
  await h.q('#discord-now').onclick();
  assert.deepEqual(h.calls.map(x=>x[0]),['login','nowplaying']);
  h.hooks.setMode('local');await h.q('#discord-now').onclick();
  assert.match(h.q('#radio-action-state').textContent,/radio_metadata_unavailable/);
  assert.equal(h.calls.length,2);
});

test('Discord partial and skipped responses are not reported as successful delivery',async()=>{
  let response={ok:true,partial:true};
  const h=harness({discordMessage:async()=>response});h.q('#discord-message').value='test';
  await h.q('#discord-send').onclick();assert.match(h.q('#radio-action-state').textContent,/PARTIAL/);
  response={ok:true,skipped:true,reason:'message cooldown'};
  await h.q('#discord-send').onclick();assert.match(h.q('#radio-action-state').textContent,/SKIPPED · message cooldown/);
});

test('flat worker messages are received, self messages ignored and history rendered as text',async()=>{
  let current={active:true,id:'1',message:'hello',senderId:'other'};
  const h=harness({playerAlertCurrent:async()=>current,playerAlertHistory:async()=>({items:[{message:'<b>test</b>'}]})});
  await h.hooks.refreshPlayerMessenger();
  assert.equal(h.q('#player-message-receive').textContent,'PLAYER · hello');
  current={active:true,id:'2',message:'self',senderId:'self'};
  await h.hooks.refreshPlayerMessenger();
  assert.equal(h.q('#player-message-receive').textContent,'PLAYER · hello');
  await h.q('#player-message-history').click();
  assert.equal(h.q('#player-message-history-state').textContent,'HISTORY · <b>test</b>');
});

test('logout invalidates an in-flight automatic-post opt-in check',async()=>{
  let resolveCheck,started;
  const pending=new Promise(resolve=>{started=resolve;});
  const h=harness({adminCheck:()=>new Promise(resolve=>{resolveCheck=resolve;started();})});
  const checkbox=h.q('#discord-auto');checkbox.checked=true;
  const change=checkbox.change({target:checkbox});await pending;
  await h.q('#radio-logout').click();resolveCheck({ok:true});await change;
  assert.equal(h.hooks.getAuto(),false);
  assert.equal(checkbox.checked,false);
});

test('a failed login clears the password and disables prior automatic posting',async()=>{
  const h=harness({adminLogin:async()=>{throw new Error('login_rejected');}});
  const checkbox=h.q('#discord-auto');checkbox.checked=true;await checkbox.change({target:checkbox});
  assert.equal(h.hooks.getAuto(),true);
  h.q('#radio-password').value='test-only-password';await h.q('#radio-login').onclick();
  assert.equal(h.q('#radio-password').value,'');
  assert.equal(h.hooks.getAuto(),false);
  assert.equal(checkbox.checked,false);
  assert.match(h.q('#radio-action-state').textContent,/login_rejected/);
});

test('config submenu reads stored and active versions and preserves untouched fields',async()=>{
  const h=harness();
  await h.q('#radio-config-load').click();await h.q('#radio-config-list').click();await h.q('#radio-config-active').click();
  assert.match(h.q('#radio-config-current').textContent,/Stored config version: 3/);
  assert.match(h.q('#radio-config-backups').textContent,/latest\.json/);
  assert.match(h.q('#radio-config-active-state').textContent,/Active version: 2/);
  h.q('#radio-config-primary-mode').value='set';h.q('#radio-config-primary').value='https://new.example/stream';
  h.q('#radio-config-backup-list-mode').value='clear';
  await h.q('#radio-config-preview').click();
  assert.match(h.q('#radio-config-preview-state').textContent,/primaryStream: 1 · https:\/\/new\.example/);
  assert.doesNotMatch(h.q('#radio-config-preview-state').textContent,/\/stream/);
  assert.equal(h.calls.length,0);
  await h.q('#radio-config-update').click();
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0][1])),{primaryStream:'https://new.example/stream',backupStreams:[]});
  assert.match(h.q('#radio-config-state').textContent,/DEPLOYMENT PENDING · CHECK ACTIVE/);
  assert.equal(h.q('#radio-config-primary').value,'');
  assert.equal(h.q('#radio-config-primary-mode').value,'keep');
  await h.q('#radio-config-rollback').click();
  assert.match(h.q('#radio-config-state').textContent,/CANCELLED/);
});

test('config submenu rejects invalid URLs without requesting a mutation',async()=>{
  const h=harness();h.q('#radio-config-primary-mode').value='set';h.q('#radio-config-primary').value='file:///not-allowed';
  await h.q('#radio-config-update').click();
  assert.match(h.q('#radio-config-state').textContent,/invalid_primaryStream/);
  assert.equal(h.calls.length,0);
});

test('probes are user-triggered and missing debug authorization is shown',async()=>{
  const h=harness({adminProbe:async name=>{if(name==='auth-debug')throw new Error('debug_authorization_not_configured');return {ok:true,ready:true};}});
  assert.equal(h.calls.length,0);
  await h.q('#radio-probe-auth-debug').click();
  assert.match(h.q('#radio-probe-result').textContent,/debug_authorization_not_configured/);
  await h.q('#radio-probe-discord-status').click();
  assert.match(h.q('#radio-probe-result').textContent,/"ready": true/);
});

test('test controls surface cancellation and do not claim delivery',async()=>{
  const h=harness();
  await h.q('#radio-discord-test').click();
  assert.match(h.q('#radio-action-state').textContent,/DISCORD TEST · CANCELLED/);
  await h.q('#radio-broadcast-test').click();
  assert.match(h.q('#radio-action-state').textContent,/BROADCAST TEST · CANCELLED/);
  assert.deepEqual(h.calls.map(x=>x[1]),['discord','broadcast']);
  const sent=harness({adminTestMessage:async()=>({ok:true,source:'cache-tertiary'})});
  await sent.q('#radio-broadcast-test').click();
  assert.match(sent.q('#radio-action-state').textContent,/ACCEPTED · DELIVERY NOT VERIFIED · SOURCE cache-tertiary/);
});
