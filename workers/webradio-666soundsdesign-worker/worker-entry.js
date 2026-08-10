import worker from './worker.js';
import { handleDiscordNotifyWithGlobalTrackGate } from './worker-addons/discord-global-gate-router.js';
import { DiscordNowPlayingGate } from './worker-addons/discord-nowplaying-gate.js';

export { DiscordNowPlayingGate };

/*
 * 666SOUNDsDESIGn — Legacy Mirror Worker Entry
 * Version: V1.0-20260810-DISCORD-GLOBAL-NOWPLAYING-GATE
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
