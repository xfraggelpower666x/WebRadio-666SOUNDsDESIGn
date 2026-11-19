'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { runAuraTest } = require('./aura-test.cjs');

const notInitialized = { result: '5' };
const ok = { result: '0' };
const keyboard = { ...ok, NB_Keyboard_4Zone: { count: '4' } };

async function simulate({ mode = 'controlled', replies = [], responses, signal, wait } = {}) {
  const calls = [];
  const messages = [];
  const status = await runAuraTest({
    platform: 'win32', mode, signal, wait: wait || (() => Promise.resolve()),
    ask: async () => replies.shift() || '',
    log: message => messages.push(message),
    request: async (url, options) => {
      assert.equal(new URL(url).origin, 'http://127.0.0.1:27339');
      assert.equal(options.redirect, 'error');
      const payload = options.body ? JSON.parse(options.body) : undefined;
      calls.push({ method: options.method, url, payload });
      assert.ok(responses.length, 'Unerwarteter HTTP-Aufruf: ' + options.method);
      const response = responses.shift();
      if (response instanceof Error) throw response;
      if (response instanceof Response) return response;
      return Response.json(response);
    }
  });
  assert.equal(responses.length, 0, 'Erwartete HTTP-Aufrufe fehlen');
  return { status, methods: calls.map(call => call.method), calls, messages };
}

test('Diagnose sendet ausschliesslich GET und meldet Code 5', async () => {
  const result = await simulate({ mode: 'diagnose', responses: [notInitialized] });
  assert.equal(result.status, 0);
  assert.deepEqual(result.methods, ['GET']);
  assert.match(result.messages.join('\n'), /RESULT_NOT_INIT/);
});

test('Abbruch vor INIT sendet keine HTTP-Aufrufe', async () => {
  const result = await simulate({ responses: [] });
  assert.equal(result.status, 0);
  assert.deepEqual(result.methods, []);
});

test('Bereits belegte Sitzung verhindert POST und DELETE', async () => {
  const result = await simulate({ replies: ['INIT'], responses: [ok] });
  assert.equal(result.status, 1);
  assert.deepEqual(result.methods, ['GET']);
});

test('Fehlgeschlagener Preflight verhindert POST und DELETE', async () => {
  const result = await simulate({ replies: ['INIT'], responses: [new Error('kein Dienst')] });
  assert.equal(result.status, 1);
  assert.deepEqual(result.methods, ['GET']);
});

test('Abgelehnte Übernahme sendet kein DELETE', async () => {
  const result = await simulate({ replies: ['INIT'], responses: [notInitialized, { result: '13' }] });
  assert.equal(result.status, 1);
  assert.deepEqual(result.methods, ['GET', 'POST']);
});

test('POST-Timeout meldet unklaren Besitz ohne DELETE', async () => {
  const result = await simulate({ replies: ['INIT'], responses: [notInitialized, new Error('Timeout')] });
  assert.equal(result.status, 4);
  assert.deepEqual(result.methods, ['GET', 'POST']);
});

test('Ungültige POST-Antwort meldet unklaren Besitz ohne Rohdaten im Bericht', async () => {
  const result = await simulate({ replies: ['INIT'], responses: [notInitialized, new Response('Rohdaten')] });
  assert.equal(result.status, 4);
  assert.doesNotMatch(result.messages.join('\n'), /Rohdaten/);
});

test('Erkennung ohne Notebook-Tastatur gibt die eigene Sitzung einmal frei', async () => {
  const result = await simulate({ replies: ['INIT'], responses: [notInitialized, ok, { ...ok, Mouse: {} }, ok] });
  assert.equal(result.status, 1);
  assert.deepEqual(result.methods, ['GET', 'POST', 'GET', 'DELETE']);
  assert.match(result.messages.join('\n'), /Gemeldete Aura-Gerätetypen: Mouse/);
});

test('Ausgelassener Farbtest gibt die Sitzung frei und meldet DELETE-Fehler', async () => {
  const result = await simulate({ replies: ['INIT'], responses: [notInitialized, ok, keyboard, { result: '4' }] });
  assert.equal(result.status, 3);
  assert.deepEqual(result.methods, ['GET', 'POST', 'GET', 'DELETE']);
});

test('Cyan adressiert ausschliesslich den erkannten 4-Zonen-Typ', async () => {
  const result = await simulate({ replies: ['INIT', 'RGB', 'J', 'J'], responses: [notInitialized, ok, keyboard, ok, ok] });
  assert.equal(result.status, 0);
  assert.deepEqual(result.methods, ['GET', 'POST', 'GET', 'PUT', 'DELETE']);
  assert.deepEqual(result.calls[3].payload, {
    data: [{ device: 'NB_Keyboard_4Zone', range: 'all', color: '16776960', apply: 'true' }]
  });
  assert.match(result.messages.join('\n'), /Cyan sichtbar: ja/);
  assert.match(result.messages.join('\n'), /ASUS-Standardeffekt wieder sichtbar: ja/);
});

test('Taste Strg+C während der Farbanzeige gibt die Sitzung frei', async () => {
  const controller = new AbortController();
  const result = await simulate({
    replies: ['INIT', 'RGB'],
    responses: [notInitialized, ok, keyboard, ok, ok],
    signal: controller.signal,
    wait: async () => {
      controller.abort();
      controller.signal.throwIfAborted();
    }
  });
  assert.equal(result.status, 130);
  assert.deepEqual(result.methods, ['GET', 'POST', 'GET', 'PUT', 'DELETE']);
});
