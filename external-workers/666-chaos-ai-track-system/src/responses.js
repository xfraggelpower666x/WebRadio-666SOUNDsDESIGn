function allowedOrigin(request, env) {
  const origin = String(request.headers.get("origin") || "").trim();
  if (!origin) return "";
  const configured = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  return configured.includes(origin) ? origin : "";
}

function baseHeaders(request, env) {
  const headers = new Headers({
    "content-type": "application/json; charset=UTF-8",
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "vary": "Origin"
  });
  const origin = allowedOrigin(request, env);
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
    headers.set("access-control-allow-headers", "content-type,authorization,x-debug-token");
  }
  return headers;
}

export function json(request, env, data, status = 200, extraHeaders = {}) {
  const headers = baseHeaders(request, env);
  for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, value);
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

export function preflight(request, env) {
  const origin = allowedOrigin(request, env);
  if (!origin) return new Response(null, { status: 403, headers: { vary: "Origin" } });
  const headers = baseHeaders(request, env);
  headers.delete("content-type");
  return new Response(null, { status: 204, headers });
}
