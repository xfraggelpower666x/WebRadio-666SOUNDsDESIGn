/*
 * 666-system-auth-worker HARDLOCK v1.2.0
 * Verifies HMAC, expiry, issuer and admin scope.
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

function decodeBase64url(value) {
  let normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4) normalized += "=";
  return decodeURIComponent(escape(atob(normalized)));
}

function base64urlBytes(buffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signRaw(payloadPart, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadPart));
  return base64urlBytes(sig);
}

async function verifyToken(token, secret) {
  if (!token || !token.includes(".")) return { ok: false, error: "token_missing" };
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, error: "token_malformed" };

  const expected = await signRaw(parts[0], secret);
  if (!timingSafeEqualText(expected, parts[1])) return { ok: false, error: "token_signature_invalid" };

  let payload;
  try { payload = JSON.parse(decodeBase64url(parts[0])); }
  catch { return { ok: false, error: "token_payload_invalid" }; }

  const now = Math.floor(Date.now() / 1000);
  if (!Number(payload.exp) || Number(payload.exp) <= now) return { ok: false, error: "token_expired" };
  if (payload.iss !== "666-system-pw") return { ok: false, error: "issuer_invalid" };
  if (payload.scope !== "admin") return { ok: false, error: "scope_invalid" };
  return { ok: true, payload };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });

    if (url.pathname === "/health" && request.method === "GET") {
      return json(request, env, { ok: true, worker: "666-system-auth-worker", version: "1.2.0", role: "auth", status: "active" });
    }

    if (url.pathname === "/debug" && request.method === "GET") {
      const expected = String(env.DEBUG_TOKEN || "").trim();
      const provided = String(request.headers.get("x-debug-token") || "").trim();
      if (!expected || !timingSafeEqualText(provided, expected)) return json(request, env, { ok: false, error: "not_found" }, 404);
      return json(request, env, {
        ok: true,
        worker: "666-system-auth-worker",
        authSecretConfigured: Boolean(env.AUTH_SECRET),
        serviceTokenConfigured: Boolean(env.ADMIN_SERVICE_TOKEN),
        allowedOrigin: normalizeOrigin(env.ALLOWED_ORIGIN)
      });
    }

    if (url.pathname === "/verify" && request.method === "POST") {
      if (!serviceRequestAllowed(request, env)) return json(request, env, { ok: false, valid: false, error: "origin_rejected" }, 403);
      if (!env.AUTH_SECRET) return json(request, env, { ok: false, valid: false, error: "worker_secrets_missing" }, 500);

      const body = await request.json().catch(() => ({}));
      let token = String(body.token || "");
      const bearer = String(request.headers.get("authorization") || "");
      if (!token && bearer.toLowerCase().startsWith("bearer ")) token = bearer.slice(7).trim();

      const result = await verifyToken(token, env.AUTH_SECRET);
      if (!result.ok) return json(request, env, { ok: false, valid: false, error: result.error }, 401);
      return json(request, env, { ok: true, valid: true, payload: result.payload });
    }

    return json(request, env, { ok: false, error: "not_found" }, 404);
  }
};
