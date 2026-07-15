/*
FILE: worker-addons/skip-api-addon.js
VERSION: 1.0.2
PURPOSE: Safe compatibility routes for the historic skip API and MyIDJ route names.
NOTE: The protected implementation remains in radio-admin-config-addon.js.
*/

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

function redirectPreservingMethod(request, targetPath) {
  const url = new URL(request.url);
  url.pathname = targetPath;
  url.search = "";
  return Response.redirect(url.toString(), 307);
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
      compatibilityRoutes: ["/api/skip", "/api/radio/skip", "/radio/autodj/skip", "/admin/autodj/skip", "/skip"],
      secretTransport: "authorization-header-preferred"
    });
  }

  if (url.pathname === "/api/skip" || url.pathname === "/api/radio/skip" || url.pathname === "/radio/autodj/skip" || url.pathname === "/admin/autodj/skip" || url.pathname === "/skip") {
    if (request.method === "POST") return redirectPreservingMethod(request, "/api/admin/skip");
    return json({
      ok: false,
      error: "method_not_allowed",
      allowed: ["POST"],
      protectedWriteRoute: "/api/admin/skip"
    }, 405, { allow: "POST" });
  }

  return null;
}
