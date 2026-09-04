import { readFile, writeFile, readdir } from 'node:fs/promises';

const OLD_MARK = '2026-09-04-panel-led-owner-v2';
const NEW_MARK = '2026-09-04-recovery-single-owner-v3';

function mustReplace(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`missing:${label}`);
  return text.replace(from, to);
}

let core = await readFile('js/player-core.js', 'utf8');

core = mustReplace(core,
`function recoverInterruptedAudio(reason = 'interrupted') {`,
`function canonicalRecoveryHandoff(reason = 'interrupted') {
  try {
    const owner = window.S666AllPlayerAudioRecovery;
    if (owner && owner.owner === 'all-player-audio-recovery-v1' && typeof owner.legacyHandoff === 'function') {
      const handoffReason = 'player-core:' + (reason || 'interrupted');
      try {
        audioSelfHealDirtyReason = '';
        document.documentElement.removeAttribute('data-audio-selfheal-dirty');
        document.documentElement.setAttribute('data-audio-selfheal-handoff', 'all-player-audio-recovery-v1');
        document.documentElement.setAttribute('data-audio-sensor-event', handoffReason);
      } catch (err) {}
      try { owner.legacyHandoff(handoffReason); } catch (err) {}
      return true;
    }
  } catch (err) {}
  return false;
}

function recoverInterruptedAudio(reason = 'interrupted') {
  if (canonicalRecoveryHandoff(reason)) return;`,
'player-core-canonical-handoff');

core = mustReplace(core,
`audio?.addEventListener('stalled', () => { panelBuffering = true; updateCanonicalPanelStatus('stalled'); markAudioSelfHealDirty('stalled'); setTimeout(() => recoverInterruptedAudio('stalled'), 350); });`,
`audio?.addEventListener('stalled', () => { panelBuffering = true; updateCanonicalPanelStatus('stalled'); setTimeout(() => recoverInterruptedAudio('stalled'), 350); });`,
'player-core-stalled-sensor-only');

core = mustReplace(core,
`audio?.addEventListener('suspend', () => { updateCanonicalPanelStatus('suspend'); markAudioSelfHealDirty('suspend'); setTimeout(() => recoverInterruptedAudio('suspend'), 350); });`,
`audio?.addEventListener('suspend', () => { updateCanonicalPanelStatus('suspend'); setTimeout(() => recoverInterruptedAudio('suspend'), 350); });`,
'player-core-suspend-sensor-only');

core = core.replaceAll(OLD_MARK, NEW_MARK);
await writeFile('js/player-core.js', core);
await writeFile('public/js/player-core.js', core);

let html = await readFile('index.html', 'utf8');

html = mustReplace(html,
`data-led="main" data-state="off" data-label="Hauptstream" data-info="Hauptstream aktiv"><i></i><b>H</b>`,
`data-led="main" data-state="off" data-label="Main Stream" data-info="Main Stream active"><i></i><b>M</b>`,
'mff-main-stream-english');

html = html.replaceAll(`setPanelLed('main','off','Hauptstream nicht aktiv');`, `setPanelLed('main','off','Main Stream inactive');`);
html = html.replaceAll(`setPanelLed('main','ok','Hauptstream aktiv');`, `setPanelLed('main','ok','Main Stream active');`);

html = mustReplace(html,
`      try{
        document.documentElement.setAttribute('data-mff-audio-selfheal-muted', reason || 'orchestra-active');
        document.documentElement.setAttribute('data-mff-audio-selfheal-handoff', 'audio-healing-orchestra');
        document.documentElement.setAttribute('data-audio-sensor-event', 'mff:' + (reason || 'interrupted'));
      }catch(e){}
      return;`,
`      try{
        mffAudioDirtyReason='';
        document.documentElement.removeAttribute('data-mff-audio-dirty');
        document.documentElement.setAttribute('data-mff-audio-selfheal-muted', reason || 'orchestra-active');
        document.documentElement.setAttribute('data-mff-audio-selfheal-handoff', 'all-player-audio-recovery-v1');
        var owner=window.S666AllPlayerAudioRecovery;
        var handoffReason='mff:'+(reason||'interrupted');
        if(owner && owner.owner==='all-player-audio-recovery-v1' && typeof owner.legacyHandoff==='function'){
          owner.legacyHandoff(handoffReason);
        }else{
          document.documentElement.setAttribute('data-audio-sensor-event',handoffReason);
        }
      }catch(e){}
      return;`,
'mff-canonical-handoff');

html = mustReplace(html,
`      a.addEventListener('pause',function(){if(!mffUserStopped){markMffAudioDirty('unexpected-pause');setTimeout(function(){recoverMffInterruptedAudio('unexpected-pause')},260)}},{passive:true});
      a.addEventListener('stalled',function(){markMffAudioDirty('stalled');setTimeout(function(){recoverMffInterruptedAudio('stalled')},360)},{passive:true});
      a.addEventListener('suspend',function(){markMffAudioDirty('suspend');setTimeout(function(){recoverMffInterruptedAudio('suspend')},360)},{passive:true});
      a.addEventListener('error',function(){markMffAudioDirty('audio-error');setTimeout(function(){recoverMffInterruptedAudio('audio-error')},500)},{passive:true});`,
`      a.addEventListener('pause',function(){if(!mffUserStopped){setTimeout(function(){recoverMffInterruptedAudio('unexpected-pause')},260)}},{passive:true});
      a.addEventListener('stalled',function(){setTimeout(function(){recoverMffInterruptedAudio('stalled')},360)},{passive:true});
      a.addEventListener('suspend',function(){setTimeout(function(){recoverMffInterruptedAudio('suspend')},360)},{passive:true});
      a.addEventListener('error',function(){setTimeout(function(){recoverMffInterruptedAudio('audio-error')},500)},{passive:true});`,
'mff-events-sensor-only');

html = html.replaceAll(OLD_MARK, NEW_MARK);
await writeFile('index.html', html);
await writeFile('public/index.html', html);

for (const name of await readdir('tests')) {
  if (!name.endsWith('.test.mjs')) continue;
  const path = `tests/${name}`;
  let text = await readFile(path, 'utf8');
  if (text.includes(OLD_MARK)) {
    text = text.replaceAll(OLD_MARK, NEW_MARK);
    await writeFile(path, text);
  }
}

const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = p => readFile(new URL('../'+p, import.meta.url), 'utf8');

test('player-core legacy mobile recovery is sensor-only when canonical owner exists', async () => {
  const core = await read('js/player-core.js');
  assert.equal(await read('public/js/player-core.js'), core);
  assert.match(core, /function canonicalRecoveryHandoff\\(reason = 'interrupted'\\)/);
  assert.match(core, /owner\\.owner === 'all-player-audio-recovery-v1'/);
  assert.match(core, /owner\\.legacyHandoff\\(handoffReason\\)/);
  assert.match(core, /function recoverInterruptedAudio\\(reason = 'interrupted'\\) \\{\\n  if \\(canonicalRecoveryHandoff\\(reason\\)\\) return;/);
  assert.doesNotMatch(core, /stalled'\\); markAudioSelfHealDirty\\('stalled'/);
  assert.doesNotMatch(core, /suspend'\\); markAudioSelfHealDirty\\('suspend'/);
});

test('MFF legacy self-heal hands off without leaving a dirty hard-reset trigger', async () => {
  const html = await read('index.html');
  assert.equal(await read('public/index.html'), html);
  assert.match(html, /data-mff-audio-selfheal-handoff', 'all-player-audio-recovery-v1'/);
  assert.match(html, /owner\\.legacyHandoff\\(handoffReason\\)/);
  assert.match(html, /mffAudioDirtyReason='';/);
  assert.doesNotMatch(html, /markMffAudioDirty\\('stalled'\\);setTimeout\\(function\\(\\)\\{recoverMffInterruptedAudio\\('stalled'\\)/);
  assert.doesNotMatch(html, /markMffAudioDirty\\('suspend'\\);setTimeout\\(function\\(\\)\\{recoverMffInterruptedAudio\\('suspend'\\)/);
});

test('mobile main source LED uses the single English Main Stream identity', async () => {
  const html = await read('index.html');
  assert.match(html, /data-led="main" data-state="off" data-label="Main Stream" data-info="Main Stream active"><i><\\/i><b>M<\\/b>/);
  assert.doesNotMatch(html, /data-label="Hauptstream"/);
  assert.doesNotMatch(html, /<b>H<\\/b>/);
});

test('repaired runtime uses fresh recovery-single-owner cache identity', async () => {
  const html = await read('index.html');
  const core = await read('js/player-core.js');
  assert.match(html, /2026-09-04-recovery-single-owner-v3/);
  assert.match(core, /2026-09-04-recovery-single-owner-v3/);
  assert.doesNotMatch(html, /2026-09-04-panel-led-owner-v2/);
  assert.doesNotMatch(core, /2026-09-04-panel-led-owner-v2/);
});
`;
await writeFile('tests/audio-recovery-runtime-single-owner.test.mjs', test);

console.log('recovery single-owner + mobile Main Stream repair applied');
