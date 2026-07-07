function configured(env) {
  return Boolean(env.SUNO_API_KEY && env.SUNO_API_BASE_URL && env.SUNO_API_PROVIDER);
}

function providerUrl(env, pathTemplate, id = "") {
  const base = new URL(env.SUNO_API_BASE_URL);
  const path = String(pathTemplate || "").replace("{id}", encodeURIComponent(id));
  return new URL(path.replace(/^\//, ""), `${base.toString().replace(/\/$/, "")}/`).toString();
}

function authHeaders(env) {
  const headerName = env.SUNO_AUTH_HEADER || "Authorization";
  const scheme = env.SUNO_AUTH_SCHEME === undefined ? "Bearer" : String(env.SUNO_AUTH_SCHEME);
  const value = scheme ? `${scheme} ${env.SUNO_API_KEY}` : env.SUNO_API_KEY;
  return { [headerName]: value, "content-type": "application/json", accept: "application/json" };
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function valueAtPath(value, path) {
  return String(path || "")
    .split(".")
    .filter(Boolean)
    .reduce((current, key) => current && current[key], value);
}

function extractJobId(data, env) {
  const configuredPath = env.SUNO_JOB_ID_FIELD || "";
  if (configuredPath) {
    const found = valueAtPath(data, configuredPath);
    if (found) return String(found);
  }
  return String(data?.jobId || data?.taskId || data?.id || data?.data?.jobId || data?.data?.taskId || data?.data?.id || "");
}

function providerSummary(data) {
  return {
    status: data?.status || data?.state || data?.data?.status || data?.data?.state || null,
    result: data?.result || data?.data?.result || data?.data || null
  };
}

export function adapterStatus(env) {
  return {
    provider: env.SUNO_API_PROVIDER || null,
    mode: "generic-rest",
    configured: configured(env),
    createPathConfigured: Boolean(env.SUNO_CREATE_PATH),
    statusPathConfigured: Boolean(env.SUNO_STATUS_PATH_TEMPLATE),
    resultPathConfigured: Boolean(env.SUNO_RESULT_PATH_TEMPLATE),
    persistentJobStoreConfigured: Boolean(env.SUNO_JOBS_KV)
  };
}

export async function createSunoJob(payload, env) {
  if (!configured(env)) return { ok: false, error: "provider_not_configured", status: 503 };
  const url = providerUrl(env, env.SUNO_CREATE_PATH || "/api/generate");
  try {
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: authHeaders(env),
      body: JSON.stringify(payload)
    }, Number(env.SUNO_REQUEST_TIMEOUT_MS) || 30000);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: "provider_create_failed", status: response.status };
    const jobId = extractJobId(data, env);
    if (!jobId) return { ok: false, error: "provider_job_id_missing", status: 502 };
    return {
      ok: true,
      provider: env.SUNO_API_PROVIDER,
      job: {
        id: jobId,
        status: providerSummary(data).status || "submitted",
        provider: env.SUNO_API_PROVIDER,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        result: providerSummary(data).result
      }
    };
  } catch (error) {
    return { ok: false, error: error?.name === "AbortError" ? "provider_timeout" : "provider_unreachable", status: 502 };
  }
}

export async function fetchSunoJob(id, env, resultMode = false) {
  if (!configured(env)) return { ok: false, error: "provider_not_configured", status: 503 };
  const template = resultMode
    ? (env.SUNO_RESULT_PATH_TEMPLATE || env.SUNO_STATUS_PATH_TEMPLATE || "/api/status/{id}")
    : (env.SUNO_STATUS_PATH_TEMPLATE || "/api/status/{id}");
  const url = providerUrl(env, template, id);
  try {
    const response = await fetchWithTimeout(url, { method: "GET", headers: authHeaders(env) }, Number(env.SUNO_REQUEST_TIMEOUT_MS) || 30000);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: "provider_status_failed", status: response.status };
    const summary = providerSummary(data);
    return {
      ok: true,
      provider: env.SUNO_API_PROVIDER,
      job: {
        id,
        status: summary.status || "unknown",
        provider: env.SUNO_API_PROVIDER,
        updatedAt: new Date().toISOString(),
        result: summary.result
      }
    };
  } catch (error) {
    return { ok: false, error: error?.name === "AbortError" ? "provider_timeout" : "provider_unreachable", status: 502 };
  }
}
