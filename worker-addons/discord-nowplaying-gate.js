/*
 * 666SOUNDsDESIGn — Discord Now Playing Global Gate Core
 * Version: V1.1-20260810
 * Scope: central dedupe/serialization logic for automatic Now Playing only.
 * The Cloudflare DurableObject wrapper lives in worker-entry.js so this core
 * remains directly testable under Node without Cloudflare runtime imports.
 * No webhook URLs, no secrets, no audio/stream/EQ/boost changes.
 */

const PENDING_TTL_MS = 90000;

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
