import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const MARK='2026-09-04-iphone-layout-appreturn-v4';

test('main iPhone foreground recovery has one canonical owner',async()=>{
 const core=await read('js/player-core.js'); const html=await read('index.html');
 assert.equal(await read('public/js/player-core.js'),core); assert.equal(await read('public/index.html'),html);
 assert.match(core,/data-player-core-app-return-owner','all-player-audio-recovery-v1/);
 assert.doesNotMatch(core,/recoverInterruptedAudio\('focus'\)/); assert.doesNotMatch(core,/recoverInterruptedAudio\('pageshow'\)/);
 assert.match(html,/data-mff-app-return-owner','all-player-audio-recovery-v1/);
 assert.doesNotMatch(html,/recoverMffInterruptedAudio\('focus'\)/); assert.doesNotMatch(html,/recoverMffInterruptedAudio\('pageshow'\)/);
 assert.ok(html.includes('/js/player-core.js?v='+MARK));
 assert.ok(html.includes('/js/media-session-ios.js?v='+MARK));
 assert.ok(html.includes('/css/mobile-patches.css?v='+MARK));
});

test('media session leaves healthy app return transport neutral',async()=>{
 const media=await read('js/media-session-ios.js'); assert.equal(await read('public/js/media-session-ios.js'),media);
 assert.match(media,/data-media-session-app-return','healthy-noop/);
 assert.doesNotMatch(media,/If hidden for < 2 seconds: probably just a notification — try resume context/);
});

test('Veluna healthy app return does not restart sound graph',async()=>{
 const files=await Promise.all(['veluna/index.html','VELUNA/index.html','public/veluna/index.html','public/VELUNA/index.html'].map(read));
 files.forEach(v=>{assert.match(v,/data-veluna-app-return','healthy-context-resume/);assert.match(v,/if\(!audio\.paused&&!audio\.ended&&audio\.readyState>=2\)\{await soundEngine\.resume\(\)/);assert.doesNotMatch(v,/healthy-context-resume[^}]*audio\.play\(/);});
});

test('main iPhone final geometry neutralizes stale HUD shift and stretches header logo',async()=>{
 const css=await read('css/mobile-patches.css'); assert.equal(await read('public/css/mobile-patches.css'),css);
 assert.match(css,/S666_IPHONE_LAYOUT_APPRETURN_V4/); assert.match(css,/transform:none!important/);
 assert.match(css,/object-fit:fill!important/); assert.match(css,/width:100%!important/);
});
