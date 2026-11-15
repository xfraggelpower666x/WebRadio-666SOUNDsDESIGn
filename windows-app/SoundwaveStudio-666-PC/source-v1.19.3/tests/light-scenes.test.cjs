const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLightScenes } = require('../src/shared/light-scenes.cjs');

const color = { type: 'devices.capabilities.color_setting', instance: 'colorRgb' };
const inventory = ['one', 'two'].map(device => ({ sku: 'H6047', device, capabilities: [color] }));
const reply = data => Response.json(data);

test('Drop teilt sich in Govee RGB und Aura BGR, Bass bleibt lokal', async () => {
  const cloud = [], local = [];
  let clock = 100;
  const lights = createLightScenes({
    platform: 'win32', now: () => clock,
    radioJson: async (url, opts, auth) => {
      cloud.push({ url, opts, auth });
      return { ok: true, data: { ok: true, devices: inventory } };
    },
    fetchAura: async (url, opts) => {
      local.push({ url, ...opts });
      if (opts.method === 'GET') return reply(local.length === 1
        ? { result: '5' } : { result: '0', NB_Keyboard_4Zone: {} });
      return reply({ result: '0' });
    }
  });
  const ids = (await lights.devices()).map(row => row.id);
  assert.equal(await lights.startAura(), 'NB_Keyboard_4Zone');
  const input = { scene: 'drop', ids, auraEnabled: true };
  assert((await lights.apply(input)).every(row => row.ok));
  assert.deepEqual(cloud.map(call => call.url), ['/api/admin/govee/devices', '/api/admin/govee/groups/control']);
  assert(cloud.every(call => call.auth));
  assert.equal(JSON.parse(cloud[1].opts.body).capability.value, 0x8800ff);
  assert.equal(JSON.parse(local[3].body).data[0].color, String(0xffff00));
  await lights.bass(0);
  await lights.bass(1);
  assert.equal(local.length, 5);
  clock += 130;
  await lights.bass(1);
  assert.equal(local.length, 6);
  await lights.apply(input);
  assert.equal(cloud.length, 2);
  await lights.stopAura();
  assert.equal(local.at(-1).method, 'DELETE');
});

test('Belegtes SDK und unklare Übernahme senden kein DELETE', async () => {
  const calls = [];
  let result = '0';
  const lights = createLightScenes({
    platform: 'win32',
    fetchAura: async (_url, opts) => {
      calls.push(opts.method);
      if (opts.method === 'POST') throw new Error('timeout');
      return reply({ result });
    }
  });
  await assert.rejects(lights.startAura(), /belegt/);
  result = '5';
  await assert.rejects(lights.startAura(), /timeout/);
  await lights.stopAura();
  await assert.rejects(lights.startAura(), /Übernahme unklar/);
  assert.deepEqual(calls, ['GET', 'GET', 'POST']);
});

test('Govee-Teilantwort hält Retry-Hinweis ein und wiederholt nur fehlende Geräte', async () => {
  const cloud = [];
  let clock = 0;
  const lights = createLightScenes({
    now: () => clock,
    radioJson: async (url, opts) => {
      cloud.push({ url, opts });
      if (!opts.body) return { ok: true, data: { devices: inventory } };
      if (url.endsWith('groups/control')) return { ok: true, status: 207, data: { ok: false, results: [
        { ...inventory[0], ok: true },
        { ...inventory[1], ok: false, retryAfterMs: 8000, error: 'rate_limited' }
      ] } };
      return { ok: true, data: { ok: true } };
    }
  });
  const ids = (await lights.devices()).map(row => row.id);
  const input = { scene: 'break', ids };
  assert.match((await lights.apply(input))[0].message, /1\/2/);
  clock = 7999;
  assert.match((await lights.apply(input))[0].message, /Befehlsfenster/);
  assert.equal(cloud.length, 2);
  clock++;
  assert((await lights.apply(input))[0].ok);
  assert.equal(JSON.parse(cloud[2].opts.body).device, 'two');
  await assert.rejects(lights.apply({ scene: '__proto__' }), /Unbekannte/);
});
