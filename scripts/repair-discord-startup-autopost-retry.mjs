import fs from 'node:fs';

const files=['js/addons/discord-player-addon-v3.js','public/js/addons/discord-player-addon-v3.js'];
const oldBlock=`    startupAutoPostDone = true;
    lastTrackKey = key;
    dispatch('s666:discord-state', { phase: 'startup-autopost', key: key });
    postTrackIfChanged(true, 'startup-first-now-playing')
      .then(function (result) {
        dispatch('s666:discord-state', { phase: result && result.skipped ? 'startup-autopost-skipped' : 'startup-autopost-success', data: result, summary: deliverySummary(result) });
      })
      .catch(function (error) {
        startupAutoPostDone = false;
        dispatch('s666:discord-state', { phase: 'startup-autopost-error', error: error && error.message ? error.message : String(error) });
      });`;
const newBlock=`    if (key === lastPostedKey) {
      startupAutoPostDone = true;
      lastTrackKey = key;
      dispatch('s666:discord-state', { phase: 'startup-autopost-skipped', reason: 'already-posted-by-watcher', key: key });
      return;
    }

    startupAutoPostDone = true;
    lastTrackKey = key;
    dispatch('s666:discord-state', { phase: 'startup-autopost', key: key });
    postTrackIfChanged(true, 'startup-first-now-playing')
      .then(function (result) {
        dispatch('s666:discord-state', { phase: result && result.skipped ? 'startup-autopost-skipped' : 'startup-autopost-success', data: result, summary: deliverySummary(result) });
      })
      .catch(function (error) {
        startupAutoPostDone = false;
        dispatch('s666:discord-state', { phase: 'startup-autopost-error', error: error && error.message ? error.message : String(error) });
        if (Date.now() - startupAutoPostStartedAt < STARTUP_MAX_WAIT_MS) {
          startupTimer = setTimeout(tryStartupAutoPost, STARTUP_RETRY_MS);
        } else {
          dispatch('s666:discord-state', { phase: 'startup-autopost-skipped', reason: 'retry-window-exhausted', key: key });
        }
      });`;

for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  const count=src.split(oldBlock).length-1;
  if(count!==1) throw new Error(`${file}: startup autopost block expected once, found ${count}`);
  fs.writeFileSync(file,src.replace(oldBlock,newBlock));
}

const test=`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');
const mirror=fs.readFileSync('public/js/addons/discord-player-addon-v3.js','utf8');

test('Discord addon root/public remain byte-identical',()=>assert.equal(root,mirror));

test('startup autopost retries temporary failures within the bounded window',()=>{
  const start=root.indexOf('  function tryStartupAutoPost()');
  const end=root.indexOf('  async function checkStatus()',start);
  assert.ok(start>=0&&end>start);
  const block=root.slice(start,end);
  assert.ok(block.includes('startupAutoPostDone = false'));
  assert.ok(block.includes('Date.now() - startupAutoPostStartedAt < STARTUP_MAX_WAIT_MS'));
  assert.ok(block.includes('startupTimer = setTimeout(tryStartupAutoPost, STARTUP_RETRY_MS)'));
  assert.ok(block.includes('retry-window-exhausted'));
});

test('startup autopost does not duplicate a watcher post',()=>{
  const start=root.indexOf('  function tryStartupAutoPost()');
  const end=root.indexOf('  async function checkStatus()',start);
  const block=root.slice(start,end);
  assert.ok(block.includes('key === lastPostedKey'));
  assert.ok(block.includes('already-posted-by-watcher'));
  assert.ok(block.indexOf('key === lastPostedKey') < block.indexOf("postTrackIfChanged(true, 'startup-first-now-playing')"));
});

test('Discord endpoint and delivery contract remain unchanged',()=>{
  assert.ok(root.includes("postJson('/api/discord/nowplaying'"));
  assert.ok(root.includes("postJson('/api/discord/manual'"));
  assert.ok(root.includes("credentials: 'same-origin'"));
  assert.ok(root.includes('if (!result || result.skipped !== true) lastPostedKey = key'));
});
`;
fs.writeFileSync('tests/discord-startup-autopost-retry.test.mjs',test);
