import { json, preflight } from "./src/responses.js";
import { requireAuth } from "./src/auth.js";
import { validateSunoPayload } from "./src/validator.js";
import { createSunoJob } from "./src/suno-adapter.js";
import { getJob, listJobs, completePlaceholder } from "./src/jobs.js";

function idFromPath(path, prefix) {
  return decodeURIComponent(path.slice(prefix.length).replace(/^\//, ""));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return preflight();

    if (url.pathname === "/health") {
      return json({ ok: true, service: "666-suno-system", time: new Date().toISOString() });
    }

    if (url.pathname === "/debug") {
      return json({
        ok: true,
        service: "666-suno-system",
        hasSunoKey: !!env.SUNO_API_KEY,
        hasSunoBaseUrl: !!env.SUNO_API_BASE_URL,
        provider: env.SUNO_API_PROVIDER || null,
        mode: env.SUNO_API_MODE || "adapter",
        authVerify: env.ADMIN_AUTH_VERIFY_URL || null
      });
    }

    if (url.pathname === "/api/suno/adapter/status") {
      return json({
        ok: true,
        provider: env.SUNO_API_PROVIDER || null,
        mode: env.SUNO_API_MODE || "adapter",
        configured: !!(env.SUNO_API_KEY && env.SUNO_API_BASE_URL),
        note: "Adapter is isolated. Placeholder mode is safe when provider is not configured."
      });
    }

    if (url.pathname === "/api/suno/create" && request.method === "POST") {
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      const payload = await request.json();
      const validation = validateSunoPayload(payload);
      if (!validation.ok) return json({ ok: false, error: "validation_failed", validation }, 400);
      const created = await createSunoJob(payload, env);
      return json({ ok: created.ok, validation, jobId: created.job?.id, status: created.job?.status, provider: created.mode || created.provider, warning: created.warning || null, detail: created });
    }

    if (url.pathname.startsWith("/api/suno/status/")) {
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      const id = idFromPath(url.pathname, "/api/suno/status/");
      let job = getJob(id);
      if (job && job.status === "queued") job = completePlaceholder(id);
      return job ? json({ ok: true, jobId: id, status: job.status, job }) : json({ ok: false, error: "job_not_found", jobId: id }, 404);
    }

    if (url.pathname.startsWith("/api/suno/result/")) {
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      const id = idFromPath(url.pathname, "/api/suno/result/");
      const job = getJob(id);
      return job ? json({ ok: true, jobId: id, status: job.status, result: job.result }) : json({ ok: false, error: "job_not_found", jobId: id }, 404);
    }

    if (url.pathname === "/api/suno/history") {
      const gate = await requireAuth(request, env);
      if (gate.response) return gate.response;
      return json({ ok: true, jobs: listJobs() });
    }

    return json({ ok: false, error: "not_found", path: url.pathname }, 404);
  }
};
