/*
FILE: worker-addons/skip-api-addon.js
VERSION: 1.0.3
PURPOSE: Safe compatibility routes for the historic skip API and MyIDJ route names.
NOTE: /api/admin/skip remains protected. Compatibility routes proxy to the existing MyIDJ worker.
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

function sameOriginEvidenceOk(request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = String(request.headers.get("origin") || "").trim();
  const referer = String(request.headers.get("referer") || "").trim();
  const fetchSite = String(request.headers.get("sec-fetch-site") || "").trim().toLowerCase();
  if (origin) return origin === requestOrigin;
  if (referer) {
    try { return new URL(referer).origin === requestOrigin; } catch { return false; }
  }
  if (fetchSite) return fetchSite === "same-origin";
  return true;
}

async function proxyMyIdjSkip(request, env = {}) {
  if (!sameOriginEvidenceOk(request)) return json({ ok: false, error: "origin_rejected" }, 403);
  const target = myIdjWorkerUrl(env);
  if (!target) return json({ ok: false, error: "myidj_worker_skip_url_missing" }, 503);

  let payload = {};
  try { payload = await request.json(); } catch {}
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8500);
  try {
    const headers = new Headers({
      accept: "application/json",
      "content-type": "application/json",
      "cache-control": "no-store",
      "user-agent": "666soundsdesign-main-worker-myidj-skip-proxy-v1.0.3"
    });
    const token = String(env.MYIDJ_WORKER_ADMIN_TOKEN || env.MYIDJ_ADMIN_TOKEN || env.ADMIN_TOKEN || "").trim();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
      headers.set("x-admin-token", token);
    }
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
      return json({ ok: false, error: data.error || data.message || `myidj_skip_http_${response.status}`, status: response.status, upstream: "myidj-worker", data }, response.ok ? 502 : response.status);
    }
    return json({ ok: true, success: true, upstream: "myidj-worker", route: target.replace(/^https?:\/\//, ""), data });
  } catch (error) {
    return json({ ok: false, error: error?.name === "AbortError" ? "myidj_skip_timeout" : "myidj_skip_unreachable" }, 502);
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
      configured: skipConfigured(env),
      protectedWriteRoute: "/api/admin/skip",
      myIdjWorkerFallback: myIdjWorkerUrl(env).replace(/^https?:\/\//, ""),
      compatibilityRoutes: ["/api/skip", "/api/radio/skip", "/radio/autodj/skip", "/admin/autodj/skip", "/skip"],
      secretTransport: "server-side-worker-proxy"
    });
  }

  if (url.pathname === "/api/skip" || url.pathname === "/api/radio/skip" || url.pathname === "/radio/autodj/skip" || url.pathname === "/admin/autodj/skip" || url.pathname === "/skip") {
    if (request.method === "POST") return proxyMyIdjSkip(request, env);
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
