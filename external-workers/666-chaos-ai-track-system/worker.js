import { json, preflight } from "./src/responses.js";
import { requireAuth } from "./src/auth.js";
import { generateWithOpenAI } from "./src/ai-client.js";
import { truncateToLimits, validateTrack } from "./src/validator.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return preflight();

    if (url.pathname === "/health") {
      return json({ ok: true, service: "666-chaos-ai-track-system", time: new Date().toISOString() });
    }

    if (url.pathname === "/debug") {
      return json({
        ok: true,
        service: "666-chaos-ai-track-system",
        hasOpenAIKey: !!env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL || "gpt-4.1-mini",
        sunoWorker: env.SUNO_WORKER_BASE_URL || null,
        authVerify: env.ADMIN_AUTH_VERIFY_URL || null
      });
    }

    if (url.pathname === "/api/chaos/generate-track" && request.method === "POST") {
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      const payload = await request.json();
      const result = await generateWithOpenAI(payload, env);
      if (!result.ok) return json(result, 502);
      const tracks = (result.tracks || []).map(t => {
        const safe = truncateToLimits(t);
        return { ...safe, validation: validateTrack(safe) };
      });
      return json({ ok: true, source: result.source || "ai", tracks });
    }

    if (url.pathname === "/api/chaos/validate" && request.method === "POST") {
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      const track = await request.json();
      return json({ ok: true, validation: validateTrack(track) });
    }

    if (["/api/chaos/generate-album","/api/chaos/generate-cover","/api/chaos/generate-description"].includes(url.pathname) && request.method === "POST") {
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      const payload = await request.json();
      return json({ ok: true, mode: url.pathname, note: "Skeleton endpoint ready. Connect prompt compiler next.", payload });
    }

    if (url.pathname === "/api/story/export") return json({ ok: true, archive: [] });
    if (url.pathname === "/api/story/archive") return json({ ok: true, archive: [] });

    return json({ ok: false, error: "not_found", path: url.pathname }, 404);
  }
};
