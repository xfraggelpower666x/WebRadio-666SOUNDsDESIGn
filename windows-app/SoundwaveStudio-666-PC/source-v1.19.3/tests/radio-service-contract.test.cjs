'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const radioCfg = require('../src/shared/radio-config.cjs');

function fixture() {
  const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const helpersStart = source.indexOf('async function radioJson(');
  const helpersEnd = source.indexOf('async function soundCloudCredentials(', helpersStart);
  const routesStart = source.indexOf("registerIpc('radio:config'");
  const routesEnd = source.indexOf('app.whenReady().then(', routesStart);
  assert.ok(helpersStart >= 0 && helpersEnd > helpersStart && routesStart >= 0 && routesEnd > routesStart);
  const handlers = {};
  const roles = {};
  const requests = [];
  const dialogs = [];
  const origin = new URL(radioCfg.radioBase).origin;
  let expired = false;
  let discordResult = { ok: true };
  let adminDebugUnavailable = false;
  let confirmation = async () => ({ response: 0 });
  const reply = (status, data) => ({ status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(data) });
  const context = {
    radioCfg, radioOrigin: origin, adminToken: '', remoteLocks: new Set(),
    process: { env: {} },
    mainWindow: {},
    dialog: { showMessageBox: async (_window, options) => { dialogs.push(options); return confirmation(); } },
    radioUrl: route => new URL(route, radioCfg.radioBase).href,
    registerIpc: (name, role, handler) => { handlers[name] = handler; roles[name] = role; },
    fetch: async (url, opts) => {
      const target = new URL(url), endpoint = target.pathname;
      const method = opts.method || 'GET';
      const body = opts.body ? JSON.parse(opts.body) : {};
      requests.push({ endpoint, host: target.origin, method, headers: opts.headers, body, redirect: opts.redirect });
      if (endpoint === radioCfg.loginRoute) {
        if (opts.headers.origin !== origin) return reply(403, { error: 'origin_rejected' });
        return reply(200, { ok: true, token: 'test-token' });
      }
      if (endpoint === radioCfg.gateRoute) {
        if (expired || opts.headers.authorization !== 'Bearer test-token') return reply(403, { ok: false, authOk: false, pwOk: false });
        return reply(200, { ok: true, authOk: true, pwOk: true });
      }
      if (endpoint === radioCfg.skipRoute) {
        if (opts.headers.origin !== origin || opts.headers.authorization !== 'Bearer test-token') return reply(403, { error: 'origin_rejected' });
        return reply(200, { ok: true });
      }
      if (target.origin === 'https://666-system-pw.666soundsdesign-broadcaster.com' || target.origin === 'https://666-system-auth.666soundsdesign-broadcaster.com') {
        if (endpoint === '/debug' && opts.headers['x-debug-token'] !== 'test-debug-token') return reply(404,{ok:false,error:'not_found'});
        return reply(200,{ok:true,worker:'test-worker',version:endpoint==='/debug'?'test-debug-token':'1.2.1',authSecretConfigured:true,secret:'never-return'});
      }
      if (endpoint === '/debug') {
        if (opts.headers['x-debug-token'] !== 'test-debug-token') return reply(404,{ok:false,error:'not_found'});
        return reply(200,{ok:true,version:'1.2.0',secret:'never-return'});
      }
      if (endpoint === '/api/admin/debug') {
        if (opts.headers.origin !== origin || opts.headers.authorization !== 'Bearer test-token') return reply(403,{ok:false,error:'auth_required'});
        if (adminDebugUnavailable) return reply(404,{ok:false,error:'not_found'});
        return reply(200,{ok:true,githubConfigured:true,runtimeKvConfigured:false,secret:'never-return'});
      }
      if (endpoint === '/api/discord/status') {
        if (opts.headers.origin !== origin || opts.headers.authorization !== 'Bearer test-token') return reply(403,{ok:false,error:'auth_required'});
        return reply(200,{ok:true,ready:true,webhookCount:1,secret:'never-return'});
      }
      if (endpoint.startsWith('/api/admin/config/') || endpoint === '/api/runtime-config/status') {
        if (expired || opts.headers.authorization !== 'Bearer test-token') return reply(403, { ok: false, error: 'auth_required' });
        if (opts.headers.origin !== origin) return reply(403, { ok: false, error: 'origin_rejected' });
        if (endpoint.endsWith('/current')) return reply(200, { ok: true, config: { version: 3, primaryStream: 'https://name:password@stream.example/private-path?token=secret', primaryStreams: ['https://stream.example/secret-path?secret=hidden'], unrelatedSecret: 'never-return' } });
        if (endpoint.endsWith('/backups')) return reply(200, { ok: true, items: [{ name: 'radio.latest.back.json', size: 12, path: 'hidden/path', sha: 'hidden-sha' }] });
        if (endpoint.endsWith('/status')) return reply(200, { ok: true, version: 2, source: 'runtime-kv', primaryStream: 'https://stream.example/secret?token=secret', metadataUpstreamCount: 1 });
        return reply(202, { ok: true, accepted: true, effectiveImmediately: false, deploymentPending: true, version: 4, secret: 'never-return' });
      }
      if (endpoint.startsWith('/api/discord/')) {
        if (opts.headers.authorization !== 'Bearer test-token') return reply(403, { error: 'auth_required' });
        return reply(200, discordResult);
      }
      if (endpoint === radioCfg.playerAlertSendRoute) {
        if (opts.headers.origin !== origin) return reply(403, { error: 'origin_rejected' });
        return reply(200, { ok: true, source:'cache-tertiary' });
      }
      return reply(200, { ok: true, title: 'test track' });
    },
    URL, Buffer, AbortController, setTimeout, clearTimeout
  };
  runInNewContext(source.slice(helpersStart, helpersEnd) + source.slice(routesStart, routesEnd), context);
  return { handlers, roles, requests, dialogs, env:context.process.env, expire: () => { expired = true; }, setAdminDebugUnavailable: () => { adminDebugUnavailable = true; }, setConfirmation: value => { confirmation = value; }, setDiscordResult: value => { discordResult = value; }, origin };
}

test('login and AutoDJ skip satisfy the worker origin and bearer gates', async () => {
  const { handlers, requests, origin } = fixture();
  assert.equal((await handlers['auth:login']({}, 'test-password')).ok, true);
  assert.equal((await handlers['radio:skip']({})).ok, true);
  const login = requests.find(r => r.endpoint === radioCfg.loginRoute);
  const skip = requests.find(r => r.endpoint === radioCfg.skipRoute);
  assert.equal(login.headers.origin, origin);
  assert.equal(skip.headers.origin, origin);
  assert.equal(skip.headers.authorization, 'Bearer test-token');
  assert.equal(skip.body.source, 'soundwave-studio-666');
});

test('expired authentication prevents protected Discord and skip writes', async () => {
  const { handlers, requests, expire } = fixture();
  await handlers['auth:login']({}, 'test-password');
  expire();
  await assert.rejects(handlers['radio:skip']({}), /gate_check_failed|auth_required|auth_token_missing/);
  assert.equal(requests.some(r => r.endpoint === radioCfg.skipRoute), false);
  await assert.rejects(handlers['radio:discord-message']({}, 'hello'), /auth_token_missing/);
});

test('Discord and player messenger use the reference request contracts', async () => {
  const { handlers, requests, origin } = fixture();
  await handlers['auth:login']({}, 'test-password');
  await handlers['radio:discord-message']({}, 'hello');
  await handlers['radio:discord-manual']({}, { title: 'manual track' });
  await handlers['radio:discord-nowplaying']({}, { title: 'test track', artist: 'test artist' });
  await handlers['player-alert:send']({}, { message: 'hello', senderId: 'test-player' });
  await handlers['player-alert:current']({});
  await handlers['player-alert:history']({});
  await handlers['player-alert:status']({});
  await handlers['radio:nowplaying']({});
  const discord = requests.find(r => r.endpoint === radioCfg.discordMessageRoute);
  const nowplaying = requests.find(r => r.endpoint === radioCfg.discordNowPlayingRoute);
  const messenger = requests.find(r => r.endpoint === radioCfg.playerAlertSendRoute);
  assert.equal(discord.body.message, 'hello');
  assert.equal(discord.headers.authorization, 'Bearer test-token');
  assert.equal(requests.find(r => r.endpoint === radioCfg.discordManualRoute).body.title, 'manual track');
  assert.equal(nowplaying.body.title, 'test track');
  assert.equal(messenger.headers.origin, origin);
  assert.equal(messenger.body.message, 'hello');
  assert.equal(requests.find(r => r.endpoint === radioCfg.nowPlaying).method, 'GET');
  for (const route of [radioCfg.playerAlertCurrentRoute, radioCfg.playerAlertHistoryRoute, radioCfg.playerAlertStatusRoute]) {
    assert.equal(requests.find(r => r.endpoint === route).method, 'GET');
  }
});

test('Discord cooldown and partial delivery responses survive the IPC adapter', async () => {
  const { handlers, setDiscordResult } = fixture();
  await handlers['auth:login']({}, 'test-password');
  setDiscordResult({ ok: true, skipped: true, reason: 'message cooldown' });
  assert.equal((await handlers['radio:discord-message']({}, 'hello')).skipped, true);
  setDiscordResult({ ok: true, partial: true });
  assert.equal((await handlers['radio:discord-nowplaying']({}, { title: 'test track' })).partial, true);
});

test('config reads require auth and expose summaries without URL secrets or tokens', async () => {
  const { handlers, roles, requests, origin } = fixture();
  for (const suffix of ['current','backups','active','update','rollback'])assert.equal(roles['radio:admin-config-'+suffix],'main');
  await assert.rejects(handlers['radio:admin-config-current']({}), /auth_token_missing/);
  assert.equal(requests.some(r => r.endpoint.endsWith('/current')), false);
  await handlers['auth:login']({}, 'test-password');
  const current = await handlers['radio:admin-config-current']({});
  const backups = await handlers['radio:admin-config-backups']({});
  const active = await handlers['radio:admin-config-active']({});
  assert.equal(current.fields.primaryStream.origins[0], 'https://stream.example');
  assert.equal(current.fields.primaryStreams.count, 1);
  assert.equal(backups.items[0].name, 'radio.latest.back.json');
  assert.equal(active.version, 2);
  assert.doesNotMatch(JSON.stringify({ current, backups, active }), /password|secret|hidden|test-token|private-path/);
  for (const route of ['/api/admin/config/current','/api/admin/config/backups','/api/runtime-config/status']) {
    const req=requests.find(r=>r.endpoint===route);
    assert.equal(req.method,'GET');assert.equal(req.headers.origin,origin);assert.equal(req.headers.authorization,'Bearer test-token');
  }
});

test('config writes require native confirmation and preserve exact worker contract', async () => {
  const {handlers,requests,dialogs,setConfirmation,origin}=fixture();
  await handlers['auth:login']({},'test-password');
  const payload={primaryStream:'https://new.example/stream',backupStreams:['https://backup.example/a'],emergencyStream:'',note:'test update'};
  const cancelled=await handlers['radio:admin-config-update']({},payload);
  assert.equal(cancelled.cancelled,true);
  assert.equal(requests.some(r=>r.endpoint==='/api/admin/config/update'),false);
  assert.equal(dialogs[0].defaultId,0);assert.equal(dialogs[0].cancelId,0);
  assert.doesNotMatch(JSON.stringify(dialogs[0]),/new\.example|backup\.example|test-token/);
  setConfirmation(async()=>({response:1}));
  const result=await handlers['radio:admin-config-update']({},payload);
  const update=requests.find(r=>r.endpoint==='/api/admin/config/update');
  assert.equal(update.method,'POST');assert.equal(update.headers.origin,origin);
  assert.equal(update.headers.authorization,'Bearer test-token');assert.deepEqual(update.body,payload);
  assert.equal(result.deploymentPending,true);assert.equal(result.effectiveImmediately,false);
  assert.doesNotMatch(JSON.stringify(result),/never-return|test-token/);
  await handlers['radio:admin-config-rollback']({});
  const rollback=requests.find(r=>r.endpoint==='/api/admin/config/rollback');
  assert.equal(rollback.method,'POST');assert.deepEqual(rollback.body,{});
  assert.equal(rollback.headers.origin,origin);assert.equal(dialogs.length,3);
});

test('invalid input or a session expiring during confirmation cannot mutate config', async()=>{
  const {handlers,requests,dialogs,setConfirmation,expire}=fixture();
  await handlers['auth:login']({},'test-password');
  await assert.rejects(handlers['radio:admin-config-update']({},{primaryStream:'file:///secret'}),/invalid_stream_url/);
  await assert.rejects(handlers['radio:admin-config-update']({},{primaryStreams:Array(13).fill('https://a.example')}),/invalid_config_list/);
  await assert.rejects(handlers['radio:admin-config-update']({},{extra:'unexpected'}),/invalid_config_field/);
  assert.equal(dialogs.length,0);
  setConfirmation(async()=>{expire();return {response:1};});
  await assert.rejects(handlers['radio:admin-config-rollback']({}),/auth_required|auth_token_missing|gate_check_failed/);
  assert.equal(requests.some(r=>r.endpoint==='/api/admin/config/rollback'),false);
});

test('logout during confirmation and concurrent mutations cannot bypass confirmation', async()=>{
  const {handlers,requests,setConfirmation}=fixture();
  await handlers['auth:login']({},'test-password');
  let release,started;
  const waiting=new Promise(resolve=>{started=resolve;});
  setConfirmation(()=>new Promise(resolve=>{release=resolve;started();}));
  const first=handlers['radio:admin-config-update']({},{primaryStream:'https://new.example/stream'});
  await waiting;
  const concurrent=await handlers['radio:admin-config-rollback']({});
  assert.equal(concurrent.busy,true);
  await handlers['auth:logout']({});
  release({response:1});
  await assert.rejects(first,/auth_session_changed/);
  assert.equal(requests.some(r=>r.endpoint==='/api/admin/config/update'||r.endpoint==='/api/admin/config/rollback'),false);
});

test('probes are fixed, authenticated, reject redirects and never return credentials',async()=>{
  const {handlers,roles,requests,env,origin,setAdminDebugUnavailable}=fixture();
  assert.equal(roles['radio:admin-probe'],'main');
  await assert.rejects(handlers['radio:admin-probe']({},'https://attacker.example'),/probe_not_supported/);
  await assert.rejects(handlers['radio:admin-probe']({},'password-health'),/auth_token_missing/);
  await handlers['auth:login']({},'test-password');
  await assert.rejects(handlers['radio:admin-probe']({},'auth-debug'),/debug_authorization_not_configured/);
  assert.equal(requests.some(r=>r.host==='https://666-system-auth.666soundsdesign-broadcaster.com'&&r.endpoint==='/debug'),false);
  env.RADIO_WAVE_AUTH_DEBUG_TOKEN='test-debug-token';env.RADIO_WAVE_RADIO_DEBUG_TOKEN='test-debug-token';
  const results=[];
  for(const name of ['password-health','auth-health','auth-debug','admin-debug','radio-debug','discord-status'])results.push(await handlers['radio:admin-probe']({},name));
  assert.doesNotMatch(JSON.stringify(results),/never-return|test-token|test-debug-token/);
  const external=requests.filter(r=>r.host.startsWith('https://666-system-'));
  assert.equal(external.length,3);assert.ok(external.every(r=>!r.headers.authorization&&r.redirect==='error'));
  const debug=external.find(r=>r.endpoint==='/debug');assert.equal(debug.headers['x-debug-token'],'test-debug-token');
  for(const endpoint of ['/api/admin/debug','/api/discord/status']){const r=requests.find(x=>x.endpoint===endpoint);assert.equal(r.headers.origin,origin);assert.equal(r.headers.authorization,'Bearer test-token');assert.equal(r.redirect,'error');}
  const radio=requests.find(r=>r.endpoint==='/debug'&&r.host===origin);assert.equal(radio.headers['x-debug-token'],'test-debug-token');assert.equal(radio.headers.authorization,undefined);
  env.RADIO_WAVE_AUTH_DEBUG_TOKEN='wrong';await assert.rejects(handlers['radio:admin-probe']({},'auth-debug'),/debug_authorization_unavailable/);
  setAdminDebugUnavailable();await assert.rejects(handlers['radio:admin-probe']({},'admin-debug'),/admin_debug_unavailable_or_unauthorized/);
});

test('test messages require explicit native consent, correct contracts and fresh authentication',async()=>{
  const {handlers,roles,requests,dialogs,setConfirmation,expire,origin}=fixture();
  assert.equal(roles['radio:admin-test-message'],'main');
  await assert.rejects(handlers['radio:admin-test-message']({},'other'),/test_not_supported/);
  await handlers['auth:login']({},'test-password');
  assert.equal((await handlers['radio:admin-test-message']({},'discord')).cancelled,true);
  assert.equal(requests.some(r=>r.endpoint==='/api/discord/test'),false);
  assert.equal(dialogs[0].defaultId,0);assert.equal(dialogs[0].cancelId,0);
  setConfirmation(async()=>({response:1}));
  const discord=await handlers['radio:admin-test-message']({},'discord');
  const broadcast=await handlers['radio:admin-test-message']({},'broadcast');
  const d=requests.find(r=>r.endpoint==='/api/discord/test'),b=requests.find(r=>r.endpoint===radioCfg.playerAlertSendRoute);
  assert.equal(d.method,'POST');assert.equal(d.redirect,'error');assert.equal(d.headers.origin,origin);assert.equal(d.headers.authorization,'Bearer test-token');
  assert.match(d.body.message,/^Admin Discord test /);assert.equal(d.body.source,'admin-overlay-test');
  assert.equal(b.method,'POST');assert.equal(b.redirect,'error');assert.equal(b.headers.origin,origin);assert.equal(b.headers.referer,radioCfg.radioBase+'/');
  assert.match(b.body.message,/^Admin broadcast test /);assert.equal(b.body.clientId,b.body.senderId);assert.equal(b.body.version,'admin-final-integration');
  assert.equal(discord.ok,true);assert.equal(broadcast.source,'cache-tertiary');
  const prior=requests.filter(r=>r.endpoint==='/api/discord/test').length;
  setConfirmation(async()=>{expire();return {response:1};});
  await assert.rejects(handlers['radio:admin-test-message']({},'discord'),/auth_required|auth_token_missing|gate_check_failed/);
  assert.equal(requests.filter(r=>r.endpoint==='/api/discord/test').length,prior);
});
