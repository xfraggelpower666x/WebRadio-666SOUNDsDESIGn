import { readFile, writeFile } from 'node:fs/promises';

const OLD_CACHE='2026-09-04-recovery-single-owner-v3';
const NEW_CACHE='2026-09-04-iphone-layout-appreturn-v4';
function mustReplace(text, from, to, label){if(!text.includes(from))throw new Error('missing:'+label);return text.replace(from,to);}

// MAIN: one foreground recovery owner only.
let core=await readFile('js/player-core.js','utf8');
const coreReturn=`window.addEventListener('focus', () => setTimeout(() => recoverInterruptedAudio('focus'), 220), { passive: true });\nwindow.addEventListener('pageshow', () => setTimeout(() => recoverInterruptedAudio('pageshow'), 220), { passive: true });\ndocument.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => recoverInterruptedAudio('visibility'), 220); });`;
core=mustReplace(core,coreReturn,`// iPhone app-return: canonical all-player-audio-recovery-v1 is the only foreground recovery owner.\n// player-core remains sensor-only for transport faults and does not emit duplicate focus/pageshow/visibility handoffs.\ndocument.documentElement.setAttribute('data-player-core-app-return-owner','all-player-audio-recovery-v1');`,'player-core-app-return');
await writeFile('js/player-core.js',core);await writeFile('public/js/player-core.js',core);

// MAIN MFF: remove duplicate foreground handoffs; canonical owner already observes app return.
let html=await readFile('index.html','utf8');
const mffReturn=`    window.addEventListener('focus',function(){setTimeout(function(){recoverMffInterruptedAudio('focus')},220)},{passive:true});\n    window.addEventListener('pageshow',function(){setTimeout(function(){recoverMffInterruptedAudio('pageshow')},220)},{passive:true});\n    document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(function(){recoverMffInterruptedAudio('visibility')},220)});`;
html=mustReplace(html,mffReturn,`    // iPhone app-return is owned by all-player-audio-recovery-v1. MFF does not issue a second foreground handoff.\n    document.documentElement.setAttribute('data-mff-app-return-owner','all-player-audio-recovery-v1');`,'mff-app-return');
html=mustReplace(html,`/js/player-core.js?v=${OLD_CACHE}`,`/js/player-core.js?v=${NEW_CACHE}`,'player-core-cache');
html=mustReplace(html,'/css/mobile-patches.css?v=2026-06-15-fix1','/css/mobile-patches.css?v='+NEW_CACHE,'mobile-patches-cache');
html=mustReplace(html,'/js/media-session-ios.js?v=2026-06-25-hardlock1','/js/media-session-ios.js?v='+NEW_CACHE,'media-session-cache');
await writeFile('index.html',html);await writeFile('public/index.html',html);

// MAIN iPhone visual repair: neutralize stale whole-HUD translation and stretch/adapt header logo to the real shell width.
let mobile=await readFile('css/mobile-patches.css','utf8');
if(!mobile.includes('S666_IPHONE_LAYOUT_APPRETURN_V4')){
mobile += `\n\n/* S666_IPHONE_LAYOUT_APPRETURN_V4 — final mobile geometry owner */\n@media (max-width:760px){\n  #mffApp .mff-shell{\n    transform:none!important;\n    width:calc(100vw - 42px)!important;\n    max-width:430px!important;\n    margin:0 auto!important;\n    padding-top:clamp(8px,1.35dvh,16px)!important;\n    padding-bottom:4px!important;\n    gap:clamp(4px,.55dvh,6px)!important;\n  }\n  #mffApp .mff-cyber-header{\n    width:100%!important;\n    height:clamp(42px,5.8dvh,56px)!important;\n    min-height:42px!important;\n    max-height:56px!important;\n    margin:0!important;\n    padding:0!important;\n    overflow:hidden!important;\n    flex:0 0 auto!important;\n  }\n  #mffApp .mff-cyber-header img{\n    display:block!important;\n    width:100%!important;\n    max-width:none!important;\n    height:100%!important;\n    max-height:none!important;\n    object-fit:fill!important;\n    object-position:center!important;\n    margin:0!important;\n  }\n}\n@media (max-width:380px) and (max-height:740px){\n  #mffApp .mff-shell{width:calc(100vw - 38px)!important;padding-top:5px!important;}\n  #mffApp .mff-cyber-header{height:40px!important;min-height:40px!important;}\n}\n`;
}
await writeFile('css/mobile-patches.css',mobile);await writeFile('public/css/mobile-patches.css',mobile);

// media-session: never touch AudioContext simply because the app became visible while transport is healthy.
let media=await readFile('js/media-session-ios.js','utf8');
const shortReturn=`      // If hidden for < 2 seconds: probably just a notification — try resume context\n      if (hiddenMs < 2000) {\n        ['__radioAudioContext', '__mffAudioContext'].forEach(function (key) {\n          var ctx = window[key];\n          if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});\n        });\n        return;\n      }`;
media=mustReplace(media,shortReturn,`      // Healthy foreground return must be transport-neutral. The canonical recovery owner decides whether recovery is needed.\n      if (!audio.paused && !audio.ended && audio.readyState >= 2) {\n        document.documentElement.setAttribute('data-media-session-app-return','healthy-noop');\n        return;\n      }\n      if (hiddenMs < 2000) return;`,'media-session-healthy-return');
await writeFile('js/media-session-ios.js',media);await writeFile('public/js/media-session-ios.js',media);

// VELUNA: healthy app return is a no-op. Do not restart/resume the sound graph if transport kept playing.
const velunaPaths=['veluna/index.html','VELUNA/index.html','public/veluna/index.html','public/VELUNA/index.html'];
for(const path of velunaPaths){
  let v=await readFile(path,'utf8');
  const old=`    async function recoverAfterReturn(source='return'){if(userStopped||!hasPlayed)return;const now=Date.now();if(now-lastRecoveryAt<2400)return;lastRecoveryAt=now;setStatus('Resume');setLamp(audioLamp,'lamp-cyan');await soundEngine.start();try{if(audio.paused)await audio.play()}catch(_){setStatus('Tap Required');setLamp(audioLamp,'lamp-amber');return}setTimeout(()=>{if(userStopped||!hasPlayed)return;if(audio.readyState<2||audio.networkState===HTMLMediaElement.NETWORK_NO_SOURCE){void playCurrent('Return Reconnect',false)}else{setStatus('Playing');setLamp(audioLamp,'lamp-green')}},1400)}`;
  const neu=`    async function recoverAfterReturn(source='return'){if(userStopped||!hasPlayed)return;const now=Date.now();if(now-lastRecoveryAt<2400)return;lastRecoveryAt=now;if(!audio.paused&&!audio.ended&&audio.readyState>=2){setStatus('Playing');setLamp(audioLamp,'lamp-green');setTransportUi('play');document.documentElement.setAttribute('data-veluna-app-return','healthy-noop');return}setStatus('Resume');setLamp(audioLamp,'lamp-cyan');await soundEngine.start();try{if(audio.paused)await audio.play()}catch(_){setStatus('Tap Required');setLamp(audioLamp,'lamp-amber');return}setTimeout(()=>{if(userStopped||!hasPlayed)return;if(audio.readyState<2||audio.networkState===HTMLMediaElement.NETWORK_NO_SOURCE){void playCurrent('Return Reconnect',false)}else{setStatus('Playing');setLamp(audioLamp,'lamp-green')}},1400)}`;
  v=mustReplace(v,old,neu,'veluna-healthy-return:'+path);
  v=v.replace('</head>',`  <meta name="s666-iphone-app-return-repair" content="${NEW_CACHE}">\n</head>`);
  await writeFile(path,v);
}

// Runtime cache contract: only changed app-return assets move to the new identity.
let cacheTest=await readFile('tests/runtime-cache-identity.test.mjs','utf8');
cacheTest=mustReplace(cacheTest,`const MARK='${OLD_CACHE}';`,`const MARK='${OLD_CACHE}';\nconst APP_RETURN_MARK='${NEW_CACHE}';`,'cache-test-mark');
cacheTest=mustReplace(cacheTest,"  assert.ok(html.includes(`/js/player-core.js?v=${MARK}`));","  assert.ok(html.includes(`/js/player-core.js?v=${APP_RETURN_MARK}`));\n  assert.ok(html.includes(`/js/media-session-ios.js?v=${APP_RETURN_MARK}`));\n  assert.ok(html.includes(`/css/mobile-patches.css?v=${APP_RETURN_MARK}`));",'cache-test-player-core');
await writeFile('tests/runtime-cache-identity.test.mjs',cacheTest);

const test=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { readFile } from 'node:fs/promises';\nconst read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');\nconst MARK='${NEW_CACHE}';\n\ntest('main iPhone foreground recovery has one canonical owner',async()=>{\n const core=await read('js/player-core.js'); const html=await read('index.html');\n assert.equal(await read('public/js/player-core.js'),core); assert.equal(await read('public/index.html'),html);\n assert.match(core,/data-player-core-app-return-owner','all-player-audio-recovery-v1/);\n assert.doesNotMatch(core,/recoverInterruptedAudio\\('focus'\\)/); assert.doesNotMatch(core,/recoverInterruptedAudio\\('pageshow'\\)/);\n assert.match(html,/data-mff-app-return-owner','all-player-audio-recovery-v1/);\n assert.doesNotMatch(html,/recoverMffInterruptedAudio\\('focus'\\)/); assert.doesNotMatch(html,/recoverMffInterruptedAudio\\('pageshow'\\)/);\n assert.ok(html.includes('/js/player-core.js?v='+MARK));\n assert.ok(html.includes('/js/media-session-ios.js?v='+MARK));\n assert.ok(html.includes('/css/mobile-patches.css?v='+MARK));\n});\n\ntest('media session leaves healthy app return transport neutral',async()=>{\n const media=await read('js/media-session-ios.js'); assert.equal(await read('public/js/media-session-ios.js'),media);\n assert.match(media,/data-media-session-app-return','healthy-noop/);\n assert.doesNotMatch(media,/If hidden for < 2 seconds: probably just a notification — try resume context/);\n});\n\ntest('Veluna healthy app return does not restart sound graph',async()=>{\n const files=await Promise.all(['veluna/index.html','VELUNA/index.html','public/veluna/index.html','public/VELUNA/index.html'].map(read));\n files.forEach(v=>{assert.match(v,/data-veluna-app-return','healthy-noop/);assert.match(v,/if\\(!audio\\.paused&&!audio\\.ended&&audio\\.readyState>=2\\)/);});\n});\n\ntest('main iPhone final geometry neutralizes stale HUD shift and stretches header logo',async()=>{\n const css=await read('css/mobile-patches.css'); assert.equal(await read('public/css/mobile-patches.css'),css);\n assert.match(css,/S666_IPHONE_LAYOUT_APPRETURN_V4/); assert.match(css,/transform:none!important/);\n assert.match(css,/object-fit:fill!important/); assert.match(css,/width:100%!important/);\n});\n`;
await writeFile('tests/iphone-layout-app-return-audio.test.mjs',test);
console.log('iPhone layout + app-return audio repair applied');
