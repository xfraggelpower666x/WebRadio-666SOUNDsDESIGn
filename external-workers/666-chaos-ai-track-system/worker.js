import { json, preflight } from "./src/responses.js";
import { requireAuth } from "./src/auth.js";
import { generateWithOpenAI } from "./src/ai-client.js";
import { repairToLimits, validateTrack } from "./src/validator.js";

const MAX_BODY_BYTES = 128 * 1024;

async function readJson(request) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) return { ok: false, status: 415, error: "content_type_must_be_json" };
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) return { ok: false, status: 413, error: "payload_too_large" };
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return { ok: false, status: 413, error: "payload_too_large" };
  try {
    return { ok: true, data: JSON.parse(text || "{}") };
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  }
}

function methodNotAllowed(request, env, allowed) {
  return json(request, env, { ok: false, error: "method_not_allowed", allowed }, 405, { allow: allowed.join(", ") });
}

async function protectedDebug(request, env) {
  const gate = await requireAuth(request, env);
  if (gate.response) return json(request, env, { ok: false, error: "not_found" }, 404);
  return json(request, env, {
    ok: true,
    service: "666-chaos-ai-track-system",
    openAIConfigured: Boolean(env.OPENAI_API_KEY),
    model: env.OPENAI_MODEL || "gpt-4.1-mini",
    sunoWorkerConfigured: Boolean(env.SUNO_WORKER_BASE_URL),
    allowedOriginsConfigured: Boolean(env.ALLOWED_ORIGINS)
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return preflight(request, env);

    if (url.pathname === "/health") {
      if (request.method !== "GET") return methodNotAllowed(request, env, ["GET"]);
      return json(request, env, { ok: true, service: "666-chaos-ai-track-system", version: "1.0.1" });
    }

    if (url.pathname === "/debug") {
      if (request.method !== "GET") return methodNotAllowed(request, env, ["GET"]);
      return protectedDebug(request, env);
    }

    if (url.pathname === "/api/chaos/generate-track") {
      if (request.method !== "POST") return methodNotAllowed(request, env, ["POST"]);
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      const parsed = await readJson(request);
      if (!parsed.ok) return json(request, env, { ok: false, error: parsed.error }, parsed.status);
      const result = await generateWithOpenAI(parsed.data, env);
      if (!result.ok) return json(request, env, result, 502);
      const tracks = (result.tracks || []).map(track => {
        const repaired = repairToLimits(track);
        return { ...repaired, validation: validateTrack(repaired) };
      });
      const invalid = tracks.some(track => !track.validation.ok);
      return json(request, env, { ok: !invalid, source: result.source || "ai", tracks }, invalid ? 422 : 200);
    }

    if (url.pathname === "/api/chaos/validate") {
      if (request.method !== "POST") return methodNotAllowed(request, env, ["POST"]);
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      const parsed = await readJson(request);
      if (!parsed.ok) return json(request, env, { ok: false, error: parsed.error }, parsed.status);
      const repaired = repairToLimits(parsed.data);
      return json(request, env, { ok: true, repaired, validation: validateTrack(repaired) });
    }

    if (["/api/chaos/generate-album", "/api/chaos/generate-cover", "/api/chaos/generate-description", "/api/story/export", "/api/story/archive"].includes(url.pathname)) {
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      return json(request, env, { ok: false, error: "not_implemented", path: url.pathname }, 501);
    }

    return json(request, env, { ok: false, error: "not_found", path: url.pathname }, 404);
  }
};
