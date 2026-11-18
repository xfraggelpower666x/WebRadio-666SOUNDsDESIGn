'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { sendGovee, createLocalGovee } = require('../src/shared/govee-bridge.cjs');
const { createAuraRest } = require('../src/shared/asus-aura-rest.cjs');

test('FX Bridge rejects HTTP 200 without positive JSON acknowledgement', async t => {
  let reply;
  t.mock.method(globalThis, 'fetch', async () => reply);
  for (const invalid of ['<h1>Wrong service</h1>', '{}', '{"ok":false,"success":true}']) {
    reply = new Response(invalid);
    await assert.rejects(sendGovee('on'), /invalid_ack/);
  }
  reply = Response.json({ ok: true });
  assert.deepEqual(await sendGovee('on'), { ok: true, confirmed: false });
});

test('port 8766 uses a catalogued UDP target, checks the receipt, and bounds analyzer traffic', async () => {
  const calls = [];
  let now = 0;
  let receipt = { id: 'lamp', sent: true, confirmed: false };
  const controller = createLocalGovee({
    now: () => now,
    request: async (url, init) => {
      calls.push([url, init.body && JSON.parse(init.body)]);
      return Response.json(init.method === 'GET'
        ? { devices: [{ id: 'lamp', name: 'Desk' }] } : { results: [receipt] });
    }
  });
  await assert.rejects(controller.command('on'), /choose_device/);
  assert.deepEqual(await controller.command('devices'), { devices: [{ id: 'lamp', label: 'Desk' }] });
  await assert.rejects(controller.command('target', 'unknown'), /choose_device/);
  await controller.command('target', 'lamp');
  assert.equal((await controller.command('on')).confirmed, false);
  assert.deepEqual(calls.at(-1), ['http://127.0.0.1:8766/api/control', { devices: ['lamp'], action: 'turn', value: true }]);
  await controller.command('color', { r: 0, g: 180, b: 255, brightness: 60 });
  assert.deepEqual(calls.slice(-2).map(row => [row[1].action, row[1].value]), [['color', '#00b4ff'], ['brightness', 60]]);
  const frame = { bass: 200, mid: 30, high: 20, energy: 100 };
  await controller.command('audio', frame);
  assert.deepEqual(await controller.command('audio', { ...frame, bass: 0 }), { skipped: true });
  now += 600;
  assert.deepEqual(await controller.command('audio', frame), { skipped: true });
  receipt = { id: 'wrong', sent: true };
  await assert.rejects(controller.command('off'), /not_sent/);
  await controller.command('devices');
  await assert.rejects(controller.command('on'), /choose_device/);
});

test('Aura acquires supported keyboards, sends BGR and releases owned control', async () => {
  const calls = [];
  const results = [{ result: 5 }, { result: 0 }, { result: 0, NB_Keyboard: {}, NB_Keyboard_4Zone: {} }];
  const controller = createAuraRest({
    platform: 'win32',
    request: async (url, init) => {
      calls.push([url, init.method, init.body && JSON.parse(init.body)]);
      return Response.json(results.shift() || { result: 0 });
    }
  });
  const authorized = () => true;
  assert.deepEqual((await controller.command('acquire', undefined, authorized)).devices, ['NB_Keyboard', 'NB_Keyboard_4Zone']);
  await controller.command('select', 'NB_Keyboard_4Zone', authorized);
  await controller.command('color', '00ffff', authorized);
  assert.deepEqual(calls.at(-1)[2].data, [{ device: 'NB_Keyboard_4Zone', range: 'all', color: '16776960', apply: 'true' }]);
  await controller.command('bass', 0, authorized);
  assert.equal(calls.at(-1)[2].data[0].color, '4210688');
  await controller.release();
  assert.equal(calls.at(-1)[1], 'DELETE');
  assert.equal(controller.isReserved(), false);
  await controller.release();
  assert.equal(calls.filter(call => call[1] === 'DELETE').length, 1);
});

test('Aura leaves a potentially foreign owner alone after ambiguous POST', async () => {
  const methods = [];
  const controller = createAuraRest({
    platform: 'win32',
    request: async (_url, init) => {
      methods.push(init.method);
      if (init.method === 'POST') throw new Error('Connection interrupted');
      return Response.json({ result: 5 });
    }
  });
  await assert.rejects(controller.command('acquire', undefined, () => false), /auth_required/);
  await assert.rejects(controller.command('acquire', undefined, () => true), /Connection interrupted/);
  await assert.rejects(controller.release(), /Übernahme unklar/);
  assert.deepEqual(methods, ['GET', 'POST']);
});
