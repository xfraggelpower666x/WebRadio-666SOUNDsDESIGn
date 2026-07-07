/*
 * 666-system-pw-worker HARDLOCK v1.2.0
 * Issues only short-lived HMAC tokens with iss=666-system-pw and scope=admin.
 */
function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function corsHeaders(request, env) {
  const configured = normalizeOrigin(env.ALLOWED_ORIGIN || "https://webradio.666soundsdesign-broadcaster.com");
  const requestOrigin = normalizeOrigin(request.headers.get("origin"));
  const allowed = requestOrigin && requestOrigin === configured ? requestOrigin : configured;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Service-Token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(request, env, data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}

function timingSafeEqualText(a, b) {
  const left = new TextEncoder().encode(String(a || ""));
  const right = new TextEncoder().encode(String(b || ""));
  let mismatch = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) mismatch |= (left[i] || 0) ^ (right[i] || 0);
  return mismatch === 0;
}

function serviceRequestAllowed(request, env) {
  const expectedToken = String(env.ADMIN_SERVICE_TOKEN || "").trim();
  const provided = String(request.headers.get("x-admin-service-token") || "").trim();
  const allowedOrigin = normalizeOrigin(env.ALLOWED_ORIGIN || "https://webradio.666soundsdesign-broadcaster.com");
  const requestOrigin = normalizeOrigin(request.headers.get("origin"));

  if (expectedToken) {
    if (!timingSafeEqualText(provided, expectedToken)) return false;
    return !requestOrigin || requestOrigin === allowedOrigin;
  }
  return Boolean(requestOrigin && requestOrigin === allowedOrigin);
}

async function signToken(payload, secret) {
  const encodedPayload = base64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload));
  return encodedPayload + "." + base64urlBytes(sig);
}

function base64url(value) {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlBytes(buffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });

    if (url.pathname === "/health" && request.method === "GET") {
      return json(request, env, { ok: true, worker: "666-system-pw-worker", version: "1.2.0", role: "password", status: "active" });
    }

    if (url.pathname === "/debug" && request.method === "GET") {
      const expected = String(env.DEBUG_TOKEN || "").trim();
      const provided = String(request.headers.get("x-debug-token") || "").trim();
      if (!expected || !timingSafeEqualText(provided, expected)) return json(request, env, { ok: false, error: "not_found" }, 404);
      return json(request, env, {
        ok: true,
        worker: "666-system-pw-worker",
        adminPasswordConfigured: Boolean(env.ADMIN_PASSWORD),
        authSecretConfigured: Boolean(env.AUTH_SECRET),
        serviceTokenConfigured: Boolean(env.ADMIN_SERVICE_TOKEN),
        allowedOrigin: normalizeOrigin(env.ALLOWED_ORIGIN)
      });
    }

    if (url.pathname === "/login" && request.method === "POST") {
      if (!serviceRequestAllowed(request, env)) return json(request, env, { ok: false, error: "origin_rejected" }, 403);
      if (!env.ADMIN_PASSWORD || !env.AUTH_SECRET) return json(request, env, { ok: false, error: "worker_secrets_missing" }, 500);

      const body = await request.json().catch(() => ({}));
      const password = String(body.password || "");
      if (!password || !timingSafeEqualText(password, env.ADMIN_PASSWORD)) {
        return json(request, env, { ok: false, error: "password_rejected" }, 401);
      }

      const now = Math.floor(Date.now() / 1000);
      const payload = { iss: "666-system-pw", scope: "admin", iat: now, exp: now + 60 * 60 * 8 };
      const token = await signToken(payload, env.AUTH_SECRET);
      return json(request, env, { ok: true, token, expiresAt: payload.exp, scope: payload.scope, issuer: payload.iss });
    }

    return json(request, env, { ok: false, error: "not_found" }, 404);
  }
};
