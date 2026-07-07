import { json, preflight } from "./src/responses.js";
import { requireAuth } from "./src/auth.js";
import { validateSunoPayload } from "./src/validator.js";
import { adapterStatus, createSunoJob, fetchSunoJob } from "./src/suno-adapter.js";
import { getJob, listJobs, saveJob } from "./src/jobs.js";

const MAX_BODY_BYTES = 128 * 1024;

function idFromPath(path, prefix) {
  return decodeURIComponent(path.slice(prefix.length).replace(/^\//, ""));
}

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return preflight(request, env);

    if (url.pathname === "/health") {
      if (request.method !== "GET") return methodNotAllowed(request, env, ["GET"]);
      return json(request, env, { ok: true, service: "666-suno-system", version: "1.0.1", configured: adapterStatus(env).configured });
    }

    if (url.pathname === "/debug") {
      if (request.method !== "GET") return methodNotAllowed(request, env, ["GET"]);
      const gate = await requireAuth(request, env);
      if (gate.response) return json(request, env, { ok: false, error: "not_found" }, 404);
      return json(request, env, { ok: true, service: "666-suno-system", adapter: adapterStatus(env) });
    }

    if (url.pathname === "/api/suno/adapter/status") {
      if (request.method !== "GET") return methodNotAllowed(request, env, ["GET"]);
      return json(request, env, { ok: true, ...adapterStatus(env) });
    }

    if (url.pathname === "/api/suno/create") {
      if (request.method !== "POST") return methodNotAllowed(request, env, ["POST"]);
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      const parsed = await readJson(request);
      if (!parsed.ok) return json(request, env, { ok: false, error: parsed.error }, parsed.status);
      const validation = validateSunoPayload(parsed.data);
      if (!validation.ok) return json(request, env, { ok: false, error: "validation_failed", validation }, 400);
      const created = await createSunoJob(parsed.data, env);
      if (!created.ok) return json(request, env, { ok: false, error: created.error }, created.status || 502);
      const persisted = await saveJob(env, created.job).catch(() => false);
      return json(request, env, { ok: true, validation, jobId: created.job.id, status: created.job.status, provider: created.provider, persisted });
    }

    if (url.pathname.startsWith("/api/suno/status/")) {
      if (request.method !== "GET") return methodNotAllowed(request, env, ["GET"]);
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      const id = idFromPath(url.pathname, "/api/suno/status/");
      if (!id) return json(request, env, { ok: false, error: "job_id_missing" }, 400);
      const remote = await fetchSunoJob(id, env, false);
      if (!remote.ok) {
        const stored = await getJob(env, id).catch(() => null);
        return stored
          ? json(request, env, { ok: true, source: "kv-fallback", job: stored })
          : json(request, env, { ok: false, error: remote.error }, remote.status || 502);
      }
      await saveJob(env, remote.job).catch(() => false);
      return json(request, env, { ok: true, source: "provider", job: remote.job });
    }

    if (url.pathname.startsWith("/api/suno/result/")) {
      if (request.method !== "GET") return methodNotAllowed(request, env, ["GET"]);
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      const id = idFromPath(url.pathname, "/api/suno/result/");
      if (!id) return json(request, env, { ok: false, error: "job_id_missing" }, 400);
      const remote = await fetchSunoJob(id, env, true);
      if (!remote.ok) return json(request, env, { ok: false, error: remote.error }, remote.status || 502);
      await saveJob(env, remote.job).catch(() => false);
      return json(request, env, { ok: true, source: "provider", jobId: id, status: remote.job.status, result: remote.job.result });
    }

    if (url.pathname === "/api/suno/history") {
      if (request.method !== "GET") return methodNotAllowed(request, env, ["GET"]);
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      const jobs = await listJobs(env).catch(() => null);
      if (!jobs) return json(request, env, { ok: false, error: "history_storage_not_configured" }, 503);
      return json(request, env, { ok: true, jobs });
    }

    return json(request, env, { ok: false, error: "not_found", path: url.pathname }, 404);
  }
};
