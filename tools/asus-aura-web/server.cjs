'use strict';

const { createServer } = require('node:http');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { createAuraRest } = require('../../windows-app/SoundwaveStudio-666-PC/source-v1.19.3/src/shared/asus-aura-rest.cjs');

const origin = 'https://webradio.666soundsdesign-broadcaster.com';
const host = '127.0.0.1';
const port = 27340;
const actions = new Set(['acquire', 'select', 'color', 'bass', 'release']);
const code = randomBytes(24).toString('hex');
const expected = Buffer.from('Bearer ' + code);
const aura = createAuraRest();
const sessionMs = 300_000;
let leaseUntil = 0;
let busy = false;

function validToken(req) {
  const token = Buffer.from(req.headers.authorization || '');
  return token.length === expected.length && timingSafeEqual(token, expected);
}

async function readCommand(req) {
  const body = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024) return null;
    body.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(body)); } catch { return null; }
}

const server = createServer(async (req, res) => {
  function reply(status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  }

  if (req.headers.host !== host + ':' + port || req.headers.origin !== origin || req.url !== '/aura') {
    return reply(403, { error: 'Webradio-Ursprung oder Ziel ungültig.' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Allow-Private-Network': 'true'
    });
    return res.end();
  }
  if (req.method !== 'POST' || !validToken(req)) return reply(403, { error: 'Kopplungscode fehlt oder ist ungültig.' });
  if (req.headers['content-type'] !== 'application/json') return reply(415, { error: 'JSON erforderlich.' });
  if (busy) return reply(409, { error: 'Aura verarbeitet bereits einen Befehl.' });

  busy = true;
  try {
    const command = await readCommand(req);
    if (!actions.has(command?.action)) return reply(400, { error: 'Unbekannter Aura-Befehl.' });
    const { action, value } = command;
    const expired = Date.now() >= leaseUntil;
    if (action === 'acquire') {
      if (expired && aura.isReserved()) await aura.release();
      leaseUntil = Date.now() + sessionMs;
    } else if (action !== 'release' && expired) {
      return reply(409, { error: 'Aura-Freigabe abgelaufen. Aura erneut übernehmen.' });
    }
    const result = await aura.command(action, value, () => action === 'release' || Date.now() < leaseUntil);
    if (action === 'release') leaseUntil = 0;
    reply(200, { ok: true, result });
  } catch (error) {
    reply(502, { error: String(error.message || error).slice(0, 180) });
  } finally {
    busy = false;
  }
});
server.requestTimeout = 5000;
server.headersTimeout = 3000;

const watchdog = setInterval(() => {
  if (busy || Date.now() < leaseUntil || !aura.isReserved()) return;
  busy = true;
  aura.release().catch(error => console.error('Aura-Freigabe: ' + error.message)).finally(() => {
    // Nach einem Fehler bleibt die nächste Freigabe als manueller Befehl möglich.
    if (aura.isReserved()) clearInterval(watchdog);
    busy = false;
  });
}, 1000);
watchdog.unref();

async function stop() {
  server.close();
  try { await aura.release(); } catch (error) { console.error(error.message); }
  process.exit(0);
}

if (process.platform !== 'win32') {
  console.error('Dieser ASUS-Aura-Dienst benötigt Windows.');
  process.exitCode = 1;
} else {
  server.listen(port, host, () => {
    console.log('666STREAM ASUS Aura · lokal bereit');
    console.log('Kopplungscode für GOV → ASUS Aura: ' + code);
    console.log('Dieses Fenster geöffnet lassen. Strg+C gibt Aura wieder frei.');
  });
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
