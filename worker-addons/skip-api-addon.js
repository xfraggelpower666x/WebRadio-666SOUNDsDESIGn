/*
FILE: worker-addons/skip-api-addon.js
VERSION: 1.2.0
PURPOSE: Safe compatibility routes for the historic skip API and MyIDJ route names.
NOTE: /api/admin/skip and its compatibility aliases are owned by the protected Player Admin gate.
*/

const DEFAULT_MYIDJ_SKIP_URL = "https://666myidjstreamadmin.666soundsdesign-broadcaster.com/api/radio/skip";

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders
    }
  });
}

function skipConfigured(env = {}) {
  const upstream = env.SHOUTCAST_ADMIN_URL || env.SONICPANEL_SKIP_URL || env.MYIDJ_SKIP_URL || env.MYIDJ_ADMIN_URL;
  const credential = env.SHOUTCAST_ADMIN_PASSWORD || env.SONICPANEL_SKIP_TOKEN || env.MYIDJ_ADMIN_PASSWORD;
  return Boolean(upstream && credential);
}

function myIdjWorkerUrl(env = {}) {
  return String(env.MYIDJ_WORKER_SKIP_URL || env.MYIDJ_PUBLIC_SKIP_URL || DEFAULT_MYIDJ_SKIP_URL).trim();
}

function myIdjWorkerToken(env = {}) {
  return String(env.MYIDJ_WORKER_ADMIN_TOKEN || env.MYIDJ_ADMIN_TOKEN || env.ADMIN_TOKEN || "").trim();
}

function myIdjProxyConfigured(env = {}) {
  return Boolean(myIdjWorkerUrl(env) && myIdjWorkerToken(env));
}

function normalizeMyIdjWorkerError(data = {}, status = 0) {
  const raw = String(data?.error || data?.message || "").trim();
  const normalized = raw.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (status === 401 || normalized === "unauthorized" || normalized.includes("admin_token")) return "myidj_admin_token_rejected";
  if (normalized === "skip_target_not_configured") return "skip_target_not_configured";
  if (normalized === "worker_exception") return "myidj_worker_exception";
  if (normalized === "method_not_allowed_use_post") return "myidj_method_contract_error";
  return normalized || `myidj_skip_http_${status || 502}`;
}

function publicMyIdjWorkerStatus(error, upstreamStatus = 0) {
  if (error === "myidj_admin_token_rejected") return 502;
  return upstreamStatus || 502;
}

export async function callMyIdjSkip(payload = {}, env = {}) {
  const target = myIdjWorkerUrl(env);
  if (!target) return { ok: false, success: false, status: 503, error: "myidj_worker_skip_url_missing", upstream: "myidj-worker" };
  const token = myIdjWorkerToken(env);
  if (!token) return { ok: false, success: false, status: 503, error: "myidj_admin_token_missing", upstream: "myidj-worker" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8500);
  try {
    const headers = new Headers({
      accept: "application/json",
      "content-type": "application/json",
      "cache-control": "no-store",
      "user-agent": "666soundsdesign-main-worker-myidj-skip-proxy-v1.1.1",
      authorization: `Bearer ${token}`,
      "x-admin-token": token
    });
    const response = await fetch(target, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...payload, source: payload.source || "main-player-myidj-proxy" }),
      redirect: "manual",
      signal: controller.signal
    });
    const text = await response.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 500) }; }
    if (!response.ok || data.ok === false) {
      const error = normalizeMyIdjWorkerError(data, response.status);
      return {
        ok: false,
        success: false,
        status: publicMyIdjWorkerStatus(error, response.status),
        upstreamStatus: response.status || 0,
        error,
        upstream: "myidj-worker",
        data
      };
    }
    return {
      ok: true,
      success: true,
      status: response.status,
      upstream: "myidj-worker",
      route: target.replace(/^https?:\/\//, ""),
      data
    };
  } catch (error) {
    return {
      ok: false,
      success: false,
      status: 502,
      error: error?.name === "AbortError" ? "myidj_skip_timeout" : "myidj_skip_unreachable",
      upstream: "myidj-worker"
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function handleSkipApi(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/api/skip/status") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ ok: false, error: "method_not_allowed", allowed: ["GET", "HEAD"] }, 405, { allow: "GET, HEAD" });
    }
    return json({
      ok: true,
      service: "666soundsdesign-skip-compatibility",
      configured: myIdjProxyConfigured(env),
      myIdjAdminTokenConfigured: Boolean(myIdjWorkerToken(env)),
      legacyDirectConfigured: skipConfigured(env),
      protectedWriteRoute: "/api/admin/skip",
      myIdjWorkerFallback: myIdjWorkerUrl(env).replace(/^https?:\/\//, ""),
      compatibilityRoutes: ["/api/skip", "/api/radio/skip", "/radio/autodj/skip", "/admin/autodj/skip", "/skip"],
      compatibilityProtection: "player-admin-gate",
      secretTransport: "server-side-worker-proxy"
    });
  }

  if (url.pathname === "/api/skip" || url.pathname === "/api/radio/skip" || url.pathname === "/radio/autodj/skip" || url.pathname === "/admin/autodj/skip" || url.pathname === "/skip") {
    if (request.method === "POST") {
      return json({
        ok: false,
        error: "protected_route_required",
        protectedWriteRoute: "/api/admin/skip"
      }, 404);
    }
    return json({
      ok: false,
      error: "method_not_allowed",
      allowed: ["POST"],
      protectedWriteRoute: "/api/admin/skip",
      myIdjWorkerFallback: myIdjWorkerUrl(env).replace(/^https?:\/\//, "")
    }, 405, { allow: "POST" });
  }

  return null;
}
