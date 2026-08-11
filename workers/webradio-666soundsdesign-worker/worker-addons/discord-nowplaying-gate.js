/*
 * 666SOUNDsDESIGn — Discord Now Playing Global Gate Core
 * Version: V1.2-20260811
 * Scope: existing global Discord dedupe plus isolated Player Alert fallback
 * storage inside separately named Durable Object instances.
 * The Cloudflare DurableObject wrapper lives in worker-entry.js so this core
 * remains directly testable under Node without Cloudflare runtime imports.
 * No webhook URLs, no secrets, no audio/stream/EQ/boost changes.
 */

const PENDING_TTL_MS = 90000;
const PLAYER_ALERT_TTL_MS = 900000;
const PLAYER_ALERT_MAX_HISTORY = 30;

function gateJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function cleanKey(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800);
}

function cleanAlertText(value, limit = 240) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function publicAlert(input = {}) {
  const now = Date.now();
  const timestamp = Number(input.timestamp || 0) || now;
  const senderId = cleanAlertText(input.senderId || input.clientId || 'anonymous', 80) || 'anonymous';
  const message = cleanAlertText(input.message, 240);
  if (!message) return null;
  return {
    ok: true,
    active: true,
    id: cleanAlertText(input.id, 80) || `do-${timestamp}`,
    message,
    username: cleanAlertText(input.username || 'Broadcast', 28) || 'Broadcast',
    senderId,
    clientId: senderId,
    timestamp,
    createdAt: cleanAlertText(input.createdAt, 80) || new Date(timestamp).toISOString(),
    version: cleanAlertText(input.version, 80),
    source: cleanAlertText(input.clientSource || input.source || 'durable-object-fallback', 80)
  };
}

function alertActive(alert) {
  if (!alert || !alert.message) return false;
  const timestamp = Number(alert.timestamp || 0);
  return Boolean(timestamp && (Date.now() - timestamp) < PLAYER_ALERT_TTL_MS);
}

function newToken() {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  } catch (_) {}
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export class DiscordNowPlayingGateCore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.serial = Promise.resolve();
  }

  fetch(request) {
    const run = () => this.handle(request);
    const next = this.serial.then(run, run);
    this.serial = next.catch(() => undefined);
    return next;
  }

  async handlePlayerAlert(path, requestMethod, input) {
    if (path === '/player-alert/status' && requestMethod === 'GET') {
      const current = await this.state.storage.get('playerAlertCurrent');
      const history = await this.state.storage.get('playerAlertHistory');
      return gateJson({
        ok: true,
        backend: 'durable-object',
        storage_scope: 'global-durable-object',
        shared_persistence: true,
        current_active: alertActive(current),
        history_size: Array.isArray(history) ? history.length : 0
      });
    }

    if (path === '/player-alert/current' && requestMethod === 'GET') {
      const current = await this.state.storage.get('playerAlertCurrent');
      if (!alertActive(current)) {
        return gateJson({ ok: true, active: false, source: 'durable-object-fallback' });
      }
      return gateJson({ ...current, ok: true, active: true, source: 'durable-object-fallback' });
    }

    if (path === '/player-alert/history' && requestMethod === 'GET') {
      const history = await this.state.storage.get('playerAlertHistory');
      const items = Array.isArray(history) ? history.slice(0, PLAYER_ALERT_MAX_HISTORY) : [];
      return gateJson({ ok: true, source: 'durable-object-fallback', items });
    }

    if (path === '/player-alert/store' && requestMethod === 'POST') {
      const alert = publicAlert(input);
      if (!alert) return gateJson({ ok: false, error: 'empty_message' }, 400);
      const storedHistory = await this.state.storage.get('playerAlertHistory');
      const history = Array.isArray(storedHistory) ? storedHistory : [];
      const deduped = history.filter((item) => item && item.id !== alert.id);
      deduped.unshift(alert);
      const bounded = deduped.slice(0, PLAYER_ALERT_MAX_HISTORY);
      await this.state.storage.put('playerAlertCurrent', alert);
      await this.state.storage.put('playerAlertHistory', bounded);
      return gateJson({
        ok: true,
        stored: true,
        storage_scope: 'global-durable-object',
        alert,
        history_size: bounded.length
      });
    }

    return gateJson({ ok: false, error: 'not_found' }, 404);
  }

  async handle(request) {
    if (request.method !== 'POST' && request.method !== 'GET') {
      return gateJson({ ok: false, error: 'method_not_allowed' }, 405);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    let input = {};
    if (request.method === 'POST') {
      try { input = await request.json(); } catch (_) { input = {}; }
    }

    if (path.startsWith('/player-alert/')) {
      return this.handlePlayerAlert(path, request.method, input);
    }

    if (path === '/status') {
      const lastKey = cleanKey(await this.state.storage.get('lastKey'));
      const lastPostedAt = Number(await this.state.storage.get('lastPostedAt') || 0);
      const pendingKey = cleanKey(await this.state.storage.get('pendingKey'));
      const pendingAt = Number(await this.state.storage.get('pendingAt') || 0);
      return gateJson({
        ok: true,
        lastKeySet: Boolean(lastKey),
        lastPostedAt: lastPostedAt || null,
        pending: Boolean(pendingKey),
        pendingAgeMs: pendingAt ? Math.max(0, Date.now() - pendingAt) : null
      });
    }

    const key = cleanKey(input.key);
    if (!key) return gateJson({ ok: false, error: 'track_key_missing' }, 400);

    if (path === '/claim') {
      const now = Date.now();
      const lastKey = cleanKey(await this.state.storage.get('lastKey'));
      if (lastKey && lastKey === key) {
        return gateJson({ ok: true, claimed: false, duplicate: true, reason: 'already_committed' });
      }

      const pendingKey = cleanKey(await this.state.storage.get('pendingKey'));
      const pendingToken = cleanKey(await this.state.storage.get('pendingToken'));
      const pendingAt = Number(await this.state.storage.get('pendingAt') || 0);
      const pendingFresh = Boolean(pendingKey && pendingToken && pendingAt && (now - pendingAt) < PENDING_TTL_MS);

      if (pendingFresh && pendingKey === key) {
        return gateJson({
          ok: true,
          claimed: false,
          duplicate: true,
          pending: true,
          reason: 'same_track_in_flight'
        });
      }

      if (pendingFresh && pendingKey !== key) {
        return gateJson({
          ok: false,
          claimed: false,
          busy: true,
          reason: 'previous_track_in_flight',
          retryAfterMs: Math.max(250, PENDING_TTL_MS - (now - pendingAt))
        }, 409);
      }

      if (pendingKey || pendingToken || pendingAt) {
        await this.state.storage.delete('pendingKey');
        await this.state.storage.delete('pendingToken');
        await this.state.storage.delete('pendingAt');
      }

      const token = newToken();
      await this.state.storage.put('pendingKey', key);
      await this.state.storage.put('pendingToken', token);
      await this.state.storage.put('pendingAt', now);
      return gateJson({ ok: true, claimed: true, duplicate: false, token });
    }

    if (path === '/commit') {
      const token = cleanKey(input.token);
      const pendingKey = cleanKey(await this.state.storage.get('pendingKey'));
      const pendingToken = cleanKey(await this.state.storage.get('pendingToken'));
      if (!token || pendingKey !== key || pendingToken !== token) {
        return gateJson({ ok: false, error: 'claim_mismatch' }, 409);
      }
      const now = Date.now();
      await this.state.storage.put('lastKey', key);
      await this.state.storage.put('lastPostedAt', now);
      await this.state.storage.delete('pendingKey');
      await this.state.storage.delete('pendingToken');
      await this.state.storage.delete('pendingAt');
      return gateJson({ ok: true, committed: true, postedAt: now });
    }

    if (path === '/release') {
      const token = cleanKey(input.token);
      const pendingKey = cleanKey(await this.state.storage.get('pendingKey'));
      const pendingToken = cleanKey(await this.state.storage.get('pendingToken'));
      if (pendingKey === key && pendingToken === token) {
        await this.state.storage.delete('pendingKey');
        await this.state.storage.delete('pendingToken');
        await this.state.storage.delete('pendingAt');
        return gateJson({ ok: true, released: true });
      }
      return gateJson({ ok: true, released: false, stale: true });
    }

    return gateJson({ ok: false, error: 'not_found' }, 404);
  }
}
