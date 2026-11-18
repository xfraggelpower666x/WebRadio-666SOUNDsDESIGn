import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../tools/asus-aura-web/server.cjs', import.meta.url), 'utf8');
const origin = 'https://webradio.666soundsdesign-broadcaster.com';
function fixture() {
  const invoked = [];
  let handler;
  let listen;
  vm.runInNewContext(source, {
    Buffer, Date,
    console: { log() {} },
    process: { platform: 'win32', on() {} },
    setInterval: () => ({ unref() {} }),
    require(name) {
      if (name === 'node:http') return { createServer(fn) {
        handler = fn;
        return { listen(port, host, fn) { listen = { port, host }; fn(); } };
      } };
      if (name === 'node:crypto') return { randomBytes: n => Buffer.alloc(n), timingSafeEqual: (a,b) => a.equals(b) };
      return { createAuraRest: () => ({
        isReserved: () => false,
        command: async (...args) => { invoked.push(args); return { devices: ['NB_Keyboard'] }; }
      }) };
    }
  });
  return { invoked, listen, async run(headers, method = 'POST', command = { action: 'acquire' }) {
    const res = { setHeader(){}, writeHead(status) { this.status = status; }, end() {} };
    const req = {
      headers: { host: '127.0.0.1:27340', origin, 'content-type': 'application/json', ...headers },
      url: '/aura', method,
      async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(command)); }
    };
    await handler(req, res);
    return res.status;
  } };
}

test('Aura-Brücke lauscht lokal und schützt den nativen Adapter mit Ursprung und Kopplungscode', async () => {
  const x = fixture();
  const auth = { authorization: 'Bearer ' + '00'.repeat(24) };
  assert.deepEqual(x.listen, { port: 27340, host: '127.0.0.1' });
  assert.equal(await x.run({ ...auth, origin: 'https://other.example' }), 403);
  assert.equal(await x.run({ ...auth, host: 'other.example:27340' }), 403);
  assert.equal(await x.run({}), 403);
  assert.equal(await x.run({}, 'OPTIONS'), 204);
  assert.equal(await x.run(auth, 'POST', { action: 'color', value: '00ff00' }), 409);
  assert.equal(x.invoked.length, 0);
  assert.equal(await x.run(auth), 200);
  assert.equal(x.invoked[0][0], 'acquire');
  assert.equal(x.invoked[0][2](), true);
});
