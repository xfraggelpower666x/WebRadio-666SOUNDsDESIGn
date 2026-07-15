/*
 * 666-system-pw-worker HARDLOCK v1.2.1
 * Issues short-lived HMAC tokens with issuer, audience and admin scope.
 * Requires service-to-service authentication and enforces login throttling.
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

  if (!expectedToken) return false;
  if (!timingSafeEqualText(provided, expectedToken)) return false;
  return !requestOrigin || requestOrigin === allowedOrigin;
}

function loginRateKey(request) {
  const ip = String(request.headers.get("cf-connecting-ip") || "unknown").trim().slice(0, 80);
  return new Request(`https://pw-rate.local/${encodeURIComponent(ip)}`);
}

async function readLoginRate(request) {
  try {
    const response = await caches.default.match(loginRateKey(request));
    if (!response) return { attempts: 0, blockedUntil: 0 };
    return await response.json();
  } catch {
    return { attempts: 0, blockedUntil: 0 };
  }
}

async function writeLoginRate(request, value, ttlSeconds) {
  try {
    await caches.default.put(loginRateKey(request), new Response(JSON.stringify(value), {
      headers: { "content-type": "application/json", "cache-control": `public, max-age=${Math.max(1, ttlSeconds)}` }
    }));
  } catch {}
}

async function clearLoginRate(request) {
  try { await caches.default.delete(loginRateKey(request)); } catch {}
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
      return json(request, env, { ok: true, worker: "666-system-pw-worker", version: "1.2.1", role: "password", status: "active" });
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
      if (!String(env.ADMIN_SERVICE_TOKEN || "").trim()) return json(request, env, { ok: false, error: "service_token_missing" }, 500);
      if (!serviceRequestAllowed(request, env)) return json(request, env, { ok: false, error: "service_auth_rejected" }, 403);
      if (!env.ADMIN_PASSWORD || !env.AUTH_SECRET || !env.AUTH_AUDIENCE) return json(request, env, { ok: false, error: "worker_secrets_missing" }, 500);

      const rate = await readLoginRate(request);
      const nowMs = Date.now();
      if (Number(rate.blockedUntil || 0) > nowMs) {
        const retryAfter = Math.max(1, Math.ceil((Number(rate.blockedUntil) - nowMs) / 1000));
        return json(request, env, { ok: false, error: "login_rate_limited", retryAfter }, 429);
      }

      const body = await request.json().catch(() => ({}));
      const password = String(body.password || "");
      if (!password || !timingSafeEqualText(password, env.ADMIN_PASSWORD)) {
        const attempts = Number(rate.attempts || 0) + 1;
        const blockedUntil = attempts >= 5 ? nowMs + 15 * 60 * 1000 : 0;
        await writeLoginRate(request, { attempts: blockedUntil ? 0 : attempts, blockedUntil }, blockedUntil ? 15 * 60 : 10 * 60);
        return json(request, env, { ok: false, error: blockedUntil ? "login_rate_limited" : "password_rejected", remaining: Math.max(0, 5 - attempts) }, blockedUntil ? 429 : 401);
      }

      await clearLoginRate(request);
      const now = Math.floor(nowMs / 1000);
      const payload = { iss: "666-system-pw", aud: String(env.AUTH_AUDIENCE), scope: "admin", iat: now, exp: now + 60 * 60 * 2 };
      const token = await signToken(payload, env.AUTH_SECRET);
      return json(request, env, { ok: true, token, expiresAt: payload.exp, scope: payload.scope, issuer: payload.iss, audience: payload.aud });
    }

    return json(request, env, { ok: false, error: "not_found" }, 404);
  }
};
