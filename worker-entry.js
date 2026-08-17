import { DurableObject } from 'cloudflare:workers';
import worker from './worker.js';
import { handleDiscordNotifyWithGlobalTrackGate } from './worker-addons/discord-global-gate-router.js';
import { DiscordNowPlayingGateCore } from './worker-addons/discord-nowplaying-gate.js';
import { handlePlayerAlertWithGlobalFallback } from './worker-addons/player-alert-global-fallback.js';
import { enrichNowPlayingWithLiveListenerCapacity } from './worker-addons/live-listener-capacity.js';

export class DiscordNowPlayingGate extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.core = new DiscordNowPlayingGateCore(ctx, env);
  }

  fetch(request) {
    return this.core.fetch(request);
  }
}

/*
 * 666SOUNDsDESIGn — Production Worker Entry
 * Version: V1.2-20260817-NONBLOCKING-METADATA-CAPACITY
 * Scope:
 * - preserve automatic Discord Now Playing global gate
 * - preserve worker.js as authoritative radio/player implementation
 * - add a global Durable Object fallback for /api/player-alert/* so an
 *   unavailable Render/KV path cannot degrade cross-network messaging to an
 *   edge-local cache only
 * - enrich /api/nowplaying with live Shoutcast max-listener capacity without
 *   ever delaying the primary metadata response
 * No new Worker/resource and no audio/stream/EQ/boost changes.
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    if (path === '/api/discord/nowplaying' && request.method === 'POST') {
      return handleDiscordNotifyWithGlobalTrackGate(
        request,
        env,
        (forwardRequest, forwardEnv) => worker.fetch(forwardRequest, forwardEnv, ctx)
      );
    }
    if (path.startsWith('/api/player-alert/')) {
      return handlePlayerAlertWithGlobalFallback(
        request,
        env,
        (forwardRequest, forwardEnv) => worker.fetch(forwardRequest, forwardEnv, ctx)
      );
    }
    if (path === '/api/nowplaying' && request.method === 'GET') {
      return enrichNowPlayingWithLiveListenerCapacity(
        request,
        env,
        (forwardRequest, forwardEnv) => worker.fetch(forwardRequest, forwardEnv, ctx),
        ctx
      );
    }
    return worker.fetch(request, env, ctx);
  }
};
