import fs from 'node:fs';

const files = [
  'js/addons/player-broadcast-alert-v148.js',
  'public/js/addons/player-broadcast-alert-v148.js'
];

const oldBlock = `    document.addEventListener('click',function(ev){
      var target=ev.target && ev.target.closest ? ev.target.closest('#playerAlertPcSend,[data-player-alert-send]') : null;
      if(!target)return;
      ev.preventDefault(); ev.stopPropagation(); sendFromPcInline();
    },true);
`;

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  const count = src.split(oldBlock).length - 1;
  if (count !== 1) throw new Error(`${file}: global send capture expected once, found ${count}`);
  src = src.replace(oldBlock, '');
  fs.writeFileSync(file, src);
}

const test = `import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = fs.readFileSync('js/addons/player-broadcast-alert-v148.js', 'utf8');
const mirror = fs.readFileSync('public/js/addons/player-broadcast-alert-v148.js', 'utf8');

test('broadcast alert mirrors remain byte-identical', () => {
  assert.equal(root, mirror);
});

test('send button has one authoritative path per viewport', () => {
  assert.ok(root.includes("btn.addEventListener('click',function(ev){ev.preventDefault();openComposer();});"));
  assert.ok(root.includes("btn.addEventListener('click',function(ev){ev.preventDefault();sendFromPcInline();});"));
  assert.ok(!root.includes("ev.target.closest('#playerAlertPcSend,[data-player-alert-send]')"));
  assert.ok(!root.includes("ev.stopPropagation(); sendFromPcInline();"));
});

test('message endpoint and composer contract remain intact', () => {
  for (const required of [
    "var SEND_URL='/api/player-alert/send'",
    'async function postMessage',
    'async function sendFromComposer',
    'async function sendFromPcInline',
    'function openComposer',
    'function mountPc'
  ]) assert.ok(root.includes(required), required);
});
`;

fs.writeFileSync('tests/broadcast-send-single-authority.test.mjs', test);
