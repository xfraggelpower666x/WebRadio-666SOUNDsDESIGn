import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGoveeAdmin } from '../worker-addons/govee-admin-addon.js';

const url = 'https://radio.example/api/admin/govee/';
const env = {
  AUTH_AUDIENCE: 'radio-test',
  GOVEE_SERVICE_TOKEN: 'fixture-service-token',
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
  assert.deepEqual(forwarded, { url: 'https://govee.internal/api/groups/control', auth: 'Bearer fixture-service-token', body });
  assert.equal(result.status, 207);
  assert.deepEqual(await result.json(), { ok: false, executed: 1 });
});
