import test from 'node:test';
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
