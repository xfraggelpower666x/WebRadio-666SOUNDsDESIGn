import { DurableObject } from 'cloudflare:workers';
import worker from './worker.js';
import { handleDiscordNotifyWithGlobalTrackGate } from './worker-addons/discord-global-gate-router.js';
import { DiscordNowPlayingGateCore } from './worker-addons/discord-nowplaying-gate.js';

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
 * Version: V1.1-20260810-DISCORD-GLOBAL-NOWPLAYING-GATE
 * Scope: intercept automatic /api/discord/nowplaying only, then delegate every
 * other route and all existing radio behavior unchanged to worker.js.
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
    return worker.fetch(request, env, ctx);
  }
};
