import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGoveeAdmin } from '../worker-addons/govee-admin-addon.js';

const url = 'https://radio.example/api/admin/govee/';
const env = {
  AUTH_AUDIENCE: 'radio-test',
  AUTH_ADMIN_WORKER: { fetch: async () => Response.json({
    ok: true, valid: true,
    payload: { iss: '666-system-pw', aud: 'radio-test', scope: 'admin', exp: 9000000000 }
  }) }
};

test('anonymous and cross-origin requests never invoke the light Worker', async () => {
  const binding = { fetch: () => assert.fail('unexpected call') };
  for (const headers of [{}, { origin: 'https://foreign.example' }]) {
    const result = await handleGoveeAdmin(new Request(url + 'devices', { headers }), { ...env, GOVEE_CONTROL_WORKER: binding });
    assert.equal(result.status, 403);
  }
});

test('admin calls use only the internal binding and carry partial outcomes', async () => {
  const body = JSON.stringify({ members: [] });
  const request = new Request(url + 'groups/control', {
    method: 'POST', body,
    headers: { authorization: 'Bearer radio-admin-fixture', 'content-type': 'application/json' }
  });
  let forwarded;
  const result = await handleGoveeAdmin(request, { ...env, GOVEE_CONTROL_WORKER: {
    fetch: async req => {
      forwarded = { url: req.url, auth: req.headers.get('authorization'), body: await req.text() };
      return Response.json({ ok: false, executed: 1 }, { status: 207 });
    }
  } });
  assert.deepEqual(forwarded, { url: 'https://govee.internal/api/groups/control', auth: null, body });
  assert.equal(result.status, 207);
  assert.deepEqual(await result.json(), { ok: false, executed: 1 });
});

test('browser cloud client discovers the selected area and forwards a power command through the admin route', async (t) => {
  const { checkGoveeArea, goveeCloudPower, goveeSendAudio } = await import('../public/js/system-extra/govee/govee-cloud-client.js');
  const forwarded = [];
  const goveeBinding = {
    fetch: async request => {
      const target = new URL(request.url);
      const data = request.method === 'POST' ? await request.json() : undefined;
      forwarded.push({ path: target.pathname + target.search, data });
      if (target.pathname === '/api/devices') return Response.json({ ok: true, devices: [{
        sku: 'H6047', device: 'fixture', capabilities: [
          { type: 'devices.capabilities.on_off', instance: 'powerSwitch' }
        ]
      }] });
      if (target.pathname === '/api/audio') return Response.json(
        { ok: false, results: [{ retryAfterMs: 15000 }] },
        { status: 429, headers: { 'Retry-After': '12' } }
      );
      return Response.json({ ok: true });
    }
  };
  t.mock.method(globalThis, 'fetch', async () => assert.fail('a direct cloud or LAN fetch was attempted'));
  const originalWindow = globalThis.window;
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  });
  globalThis.window = { S666AdminAuth: {
    getToken: () => 'admin-fixture',
    fetch: (relative, init) => {
      assert.match(relative, /^\/api\/admin\/govee\//);
      const headers = new Headers(init.headers);
      headers.set('authorization', 'Bearer admin-fixture');
      return handleGoveeAdmin(new Request('https://radio.example' + relative, { ...init, headers }),
        { ...env, GOVEE_CONTROL_WORKER: goveeBinding });
    }
  } };

  assert.equal(await checkGoveeArea('bars'), 1);
  await goveeCloudPower('bars', true);
  await assert.rejects(goveeSendAudio({ area: 'bars', energy: 0.5 }), {
    message: 'govee_rate_limit', retryAfterMs: 15000
  });
  assert.deepEqual(forwarded, [
    { path: '/api/devices?area=bars', data: undefined },
    { path: '/api/devices?area=bars', data: undefined },
    { path: '/api/control', data: { sku: 'H6047', device: 'fixture', capability: {
      type: 'devices.capabilities.on_off', instance: 'powerSwitch', value: 1
    } } },
    { path: '/api/audio', data: { area: 'bars', energy: 0.5 } }
  ]);
});
