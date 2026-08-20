/*
FILE: worker-addons/skip-api-addon.js
VERSION: 1.4.0
PURPOSE: Server-side bridge from the protected Player Admin gate to the dedicated AutoDJ Skip Worker.
SECURITY: The dedicated worker access token never leaves the main Worker. Browser requests must use the Player Admin bearer token and are verified by radio-admin-config-addon.js before this bridge is called.
*/

const DEFAULT_AUTODJ_SKIP_URL = "https://666-autodj-skip.666soundsdesign-broadcaster.com/autodj/skip";

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

function dedicatedSkipUrl(env = {}) {
  return String(env.S666_AUTODJ_SKIP_URL || DEFAULT_AUTODJ_SKIP_URL).trim();
}

function dedicatedSkipToken(env = {}) {
  return String(env.S666_AUTODJ_SKIP_ACCESS_TOKEN || "").trim();
}

function dedicatedSkipConfigured(env = {}) {
  return Boolean(dedicatedSkipUrl(env) && dedicatedSkipToken(env));
}

function normalizeDedicatedError(data = {}, status = 0) {
  const raw = String(data?.error || data?.message || "").trim();
  const normalized = raw.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (status === 401 || status === 403 || normalized.includes("unauthorized") || normalized.includes("access_token")) {
    return "autodj_skip_access_token_rejected";
  }
  if (normalized.includes("sonicpanel") && normalized.includes("login")) return "autodj_sonicpanel_login_failed";
  if (normalized.includes("verification") || normalized.includes("title_did_not_change")) return "autodj_skip_not_verified";
  if (normalized.includes("timeout")) return "autodj_skip_timeout";
  return normalized || `autodj_skip_http_${status || 502}`;
}

function cleanTrack(value) {
  return String(value == null ? "" : value).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 320);
}

export async function callMyIdjSkip(payload = {}, env = {}) {
  const target = dedicatedSkipUrl(env);
  const token = dedicatedSkipToken(env);
  if (!target) {
    return { ok: false, success: false, status: 503, error: "autodj_skip_url_missing", upstream: "666-autodj-skip" };
  }
  if (!token) {
    return { ok: false, success: false, status: 503, error: "autodj_skip_access_token_missing", upstream: "666-autodj-skip" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "cache-control": "no-store",
        authorization: `Bearer ${token}`,
        "user-agent": "666soundsdesign-main-worker-autodj-skip-v1.4.0"
      },
      body: JSON.stringify({ source: payload.source || "admin-player" }),
      redirect: "manual",
      signal: controller.signal
    });

    const text = await response.text().catch(() => "");
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch { data = {}; }

    if (!response.ok || data?.ok !== true) {
      return {
        ok: false,
        success: false,
        status: response.status || 502,
        upstreamStatus: response.status || 0,
        error: normalizeDedicatedError(data, response.status),
        upstream: "666-autodj-skip"
      };
    }

    return {
      ok: true,
      success: true,
      status: response.status,
      upstreamStatus: response.status,
      upstream: "666-autodj-skip",
      service: data.service || "666-autodj-skip",
      version: data.version || null,
      action: data.action || "autodj_skip",
      verified: data.verified !== false,
      previousTrack: cleanTrack(data.previousTrack),
      currentTrack: cleanTrack(data.currentTrack)
    };
  } catch (error) {
    return {
      ok: false,
      success: false,
      status: 502,
      error: error?.name === "AbortError" ? "autodj_skip_timeout" : "autodj_skip_unreachable",
      upstream: "666-autodj-skip"
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
      service: "666soundsdesign-autodj-skip-bridge",
      version: "1.4.0",
      configured: dedicatedSkipConfigured(env),
      accessTokenConfigured: Boolean(dedicatedSkipToken(env)),
      protectedWriteRoute: "/api/admin/skip",
      dedicatedWorker: dedicatedSkipUrl(env).replace(/^https?:\/\//, ""),
      compatibilityRoutes: ["/api/skip", "/api/radio/skip", "/radio/autodj/skip", "/admin/autodj/skip", "/skip"],
      compatibilityProtection: "player-admin-gate",
      secretTransport: "server-side-only"
    });
  }

  if (url.pathname === "/api/skip" || url.pathname === "/api/radio/skip" || url.pathname === "/radio/autodj/skip" || url.pathname === "/admin/autodj/skip" || url.pathname === "/skip") {
    if (request.method === "POST") {
      return json({ ok: false, error: "protected_route_required", protectedWriteRoute: "/api/admin/skip" }, 404);
    }
    return json({
      ok: false,
      error: "method_not_allowed",
      allowed: ["POST"],
      protectedWriteRoute: "/api/admin/skip"
    }, 405, { allow: "POST" });
  }

  return null;
}
