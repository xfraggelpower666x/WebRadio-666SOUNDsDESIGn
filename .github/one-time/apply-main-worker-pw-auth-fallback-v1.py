from pathlib import Path
import re

ROOT = Path('.')
SOURCE = ROOT / 'worker-addons/radio-admin-config-addon.js'
MIRROR = ROOT / 'workers/webradio-666soundsdesign-worker/worker-addons/radio-admin-config-addon.js'
TESTS = ROOT / 'tests/admin-hardlock.test.mjs'
MARKER = 'MAIN_WORKER_CANONICAL_AUTH_FALLBACK_V1'

text = SOURCE.read_text(encoding='utf-8')
if MARKER not in text:
    text = text.replace('VERSION: 1.0.1', 'VERSION: 1.0.2', 1)
    text = text.replace(
        'const DEFAULT_TIMEOUT_MS = 8000;\n',
        'const DEFAULT_TIMEOUT_MS = 8000;\n'
        'const CANONICAL_PW_LOGIN_URL = "https://666-system-pw.666soundsdesign-broadcaster.com/login";\n'
        'const CANONICAL_AUTH_VERIFY_URL = "https://666-system-auth.666soundsdesign-broadcaster.com/verify";\n',
        1,
    )

    fetch_anchor = 'async function fetchWithTimeout(url, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {'
    if fetch_anchor not in text:
        raise RuntimeError('fetchWithTimeout anchor missing')
    text = text.replace(
        fetch_anchor,
        '''// MAIN_WORKER_CANONICAL_AUTH_FALLBACK_V1\nfunction uniqueUpstreamUrls(...values) {\n  const urls = [];\n  for (const value of values) {\n    const raw = String(value || "").trim();\n    if (!raw) continue;\n    try {\n      const url = new URL(raw);\n      if (!/^https?:$/.test(url.protocol)) continue;\n      const normalized = url.toString();\n      if (!urls.includes(normalized)) urls.push(normalized);\n    } catch {}\n  }\n  return urls;\n}\n\n''' + fetch_anchor,
        1,
    )

    verify_marker = '\nexport async function verifyAdminAuth(request, env) {'
    if verify_marker not in text:
        raise RuntimeError('verifyAdminAuth anchor missing')
    text = text.replace(
        verify_marker,
        '''\nasync function fetchVerificationWithFallback(configuredUrl, token, label, env = {}) {\n  const urls = uniqueUpstreamUrls(configuredUrl, CANONICAL_AUTH_VERIFY_URL);\n  let last = { ok: false, service: label, payload: null, error: "verification_unreachable", upstream: null };\n  for (const url of urls) {\n    const result = await fetchVerification(url, token, label, env);\n    last = { ...result, upstream: url };\n    if (result.ok) return last;\n  }\n  return last;\n}\n\nexport async function verifyAdminAuth(request, env) {''',
        1,
    )

    old_verify = '''export async function verifyAdminAuth(request, env) {\n  const verifyUrl = env.ADMIN_AUTH_VERIFY_URL || "https://666-system-auth.666soundsdesign-broadcaster.com/verify";\n  const token = getCookie(request, "admin_auth") || bearerToken(request);\n  if (!token) return { ok: false, service: "auth", payload: null, error: "auth_token_missing" };\n  const result = await fetchVerification(verifyUrl, token, "auth", env);\n  result.expectedAudience = String(env.AUTH_AUDIENCE || "");\n  return result;\n}'''
    new_verify = '''export async function verifyAdminAuth(request, env) {\n  const token = getCookie(request, "admin_auth") || bearerToken(request);\n  if (!token) return { ok: false, service: "auth", payload: null, error: "auth_token_missing" };\n  const result = await fetchVerificationWithFallback(env.ADMIN_AUTH_VERIFY_URL, token, "auth", env);\n  result.expectedAudience = String(env.AUTH_AUDIENCE || "");\n  return result;\n}'''
    if old_verify not in text:
        raise RuntimeError('verifyAdminAuth original block missing')
    text = text.replace(old_verify, new_verify, 1)

    login_pattern = re.compile(r'async function loginAdmin\(request, env\) \{.*?\n\}\n\nfunction requiredEnv', re.S)
    login_match = login_pattern.search(text)
    if not login_match:
        raise RuntimeError('loginAdmin block missing')
    new_login = '''async function loginAdmin(request, env) {\n  if (!isSameOrigin(request, { requireEvidence: true })) return adminJson({ ok: false, error: "origin_rejected" }, 403);\n  let body;\n  try {\n    body = await request.json();\n  } catch {\n    return adminJson({ ok: false, error: "invalid_json" }, 400);\n  }\n  const password = String(body?.password || "");\n  if (!password) return adminJson({ ok: false, error: "password_missing" }, 400);\n\n  const loginUrls = uniqueUpstreamUrls(env.PW_LOGIN_URL, env.ADMIN_AUTH_LOGIN_URL, CANONICAL_PW_LOGIN_URL);\n  let lastFailure = { status: 502, error: "pw_login_unreachable" };\n\n  for (const loginUrl of loginUrls) {\n    try {\n      const response = await fetchWithTimeout(loginUrl, {\n        method: "POST",\n        headers: adminServiceHeaders(env, {\n          accept: "application/json",\n          "content-type": "application/json",\n          "cache-control": "no-store"\n        }),\n        body: JSON.stringify({ password }),\n        redirect: "error"\n      }, 7000);\n      const data = await response.json().catch(() => ({}));\n\n      if (!response.ok || data?.ok !== true || !data?.token) {\n        const error = normalizeAdminError(data?.error, "login_rejected");\n        lastFailure = { status: response.status || 502, error };\n        if (error === "password_rejected" || error === "login_rate_limited") break;\n        continue;\n      }\n\n      const verified = await fetchVerificationWithFallback(env.ADMIN_AUTH_VERIFY_URL, data.token, "auth", env);\n      verified.expectedAudience = String(env.AUTH_AUDIENCE || "");\n      const pw = verifyPwIssuedToken(verified);\n      if (!pw.ok) {\n        lastFailure = { status: 401, error: pw.error || verified.error || "token_verification_failed" };\n        continue;\n      }\n\n      return adminJson({\n        ok: true,\n        token: data.token,\n        expiresAt: data.expiresAt || verified?.payload?.exp || null,\n        scope: verified?.payload?.scope || "admin",\n        issuer: verified?.payload?.iss || "666-system-pw"\n      });\n    } catch (error) {\n      lastFailure = {\n        status: 502,\n        error: error?.name === "AbortError" ? "pw_login_timeout" : "pw_login_unreachable"\n      };\n    }\n  }\n\n  return adminJson({ ok: false, error: lastFailure.error }, lastFailure.status || 502);\n}\n\nfunction requiredEnv'''
    text = login_pattern.sub(new_login, text, count=1)

    probe_anchor = '\nasync function authLiveState(request, env) {'
    if probe_anchor not in text:
        raise RuntimeError('authLiveState anchor missing')
    text = text.replace(
        probe_anchor,
        '''\nasync function probeWorkerHealthCandidates(...urls) {\n  const candidates = uniqueUpstreamUrls(...urls);\n  let last = { reachable: false, version: null, status: 0, worker: null, error: "url_missing", upstream: null };\n  for (const raw of candidates) {\n    const result = await probeWorkerHealth(healthUrlFrom(raw, ""));\n    last = { ...result, upstream: raw };\n    if (result.reachable) return last;\n  }\n  return last;\n}\n\nasync function authLiveState(request, env) {''',
        1,
    )

    old_probe = '''  const pwHealthUrl = healthUrlFrom(env.PW_LOGIN_URL || env.ADMIN_AUTH_LOGIN_URL, "https://666-system-pw.666soundsdesign-broadcaster.com/login");\n  const authHealthUrl = healthUrlFrom(env.ADMIN_AUTH_VERIFY_URL, "https://666-system-auth.666soundsdesign-broadcaster.com/verify");\n  const [pw, auth] = await Promise.all([\n    probeWorkerHealth(pwHealthUrl),\n    probeWorkerHealth(authHealthUrl)\n  ]);'''
    new_probe = '''  const [pw, auth] = await Promise.all([\n    probeWorkerHealthCandidates(env.PW_LOGIN_URL, env.ADMIN_AUTH_LOGIN_URL, CANONICAL_PW_LOGIN_URL),\n    probeWorkerHealthCandidates(env.ADMIN_AUTH_VERIFY_URL, CANONICAL_AUTH_VERIFY_URL)\n  ]);'''
    if old_probe not in text:
        raise RuntimeError('authLiveState probe block missing')
    text = text.replace(old_probe, new_probe, 1)
    text = text.replace(
        'pw: { reachable: Boolean(pw.reachable), status: pw.status, worker: pw.worker, error: pw.error },\n      auth: { reachable: Boolean(auth.reachable), status: auth.status, worker: auth.worker, error: auth.error }',
        'pw: { reachable: Boolean(pw.reachable), status: pw.status, worker: pw.worker, error: pw.error, upstream: pw.upstream },\n      auth: { reachable: Boolean(auth.reachable), status: auth.status, worker: auth.worker, error: auth.error, upstream: auth.upstream }',
        1,
    )

    SOURCE.write_text(text, encoding='utf-8')

MIRROR.write_text(SOURCE.read_text(encoding='utf-8'), encoding='utf-8')

# Add targeted regression tests.
tests = TESTS.read_text(encoding='utf-8')
marker = 'login falls back from stale configured PW/Auth URLs to canonical workers'
if marker not in tests:
    insertion = r'''

test("login falls back from stale configured PW/Auth URLs to canonical workers", async () => {
  const seen = [];
  await withMockFetch(async (url, init = {}) => {
    const value = String(url);
    seen.push(value);
    if (value.includes("stale-pw.invalid")) throw new Error("configured_pw_unreachable");
    if (value.includes("666-system-pw")) return Response.json({ ok: true, token: "abc.def", expiresAt: FUTURE });
    if (value.includes("stale-auth.invalid")) throw new Error("configured_auth_unreachable");
    if (value.includes("666-system-auth")) return Response.json({ ok: true, valid: true, payload: { iss: "666-system-pw", aud: AUDIENCE, scope: "admin", exp: FUTURE } });
    throw new Error("unexpected_fetch:" + value);
  }, async () => {
    const response = await handleRadioAdminConfigAddon(request("/api/admin/login", {
      method: "POST",
      headers: { origin: "https://radio.test", "content-type": "application/json" },
      body: JSON.stringify({ password: "correct" })
    }), {
      PW_LOGIN_URL: "https://stale-pw.invalid/login",
      ADMIN_AUTH_VERIFY_URL: "https://stale-auth.invalid/verify",
      ADMIN_SERVICE_ORIGIN: "https://radio.test",
      ADMIN_SERVICE_TOKEN: "service-secret",
      AUTH_AUDIENCE: AUDIENCE
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    assert.deepEqual(seen, [
      "https://stale-pw.invalid/login",
      "https://666-system-pw.666soundsdesign-broadcaster.com/login",
      "https://stale-auth.invalid/verify",
      "https://666-system-auth.666soundsdesign-broadcaster.com/verify"
    ]);
  });
});

test("a definitive password rejection does not fan out to another password worker", async () => {
  const seen = [];
  await withMockFetch(async (url) => {
    seen.push(String(url));
    return Response.json({ ok: false, error: "password_rejected" }, { status: 401 });
  }, async () => {
    const response = await handleRadioAdminConfigAddon(request("/api/admin/login", {
      method: "POST",
      headers: { origin: "https://radio.test", "content-type": "application/json" },
      body: JSON.stringify({ password: "wrong" })
    }), {
      PW_LOGIN_URL: "https://configured-pw.example/login",
      ADMIN_SERVICE_ORIGIN: "https://radio.test",
      ADMIN_SERVICE_TOKEN: "service-secret",
      AUTH_AUDIENCE: AUDIENCE
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, "password_rejected");
    assert.deepEqual(seen, ["https://configured-pw.example/login"]);
  });
});
'''
    tests += insertion
    TESTS.write_text(tests, encoding='utf-8')

if SOURCE.read_bytes() != MIRROR.read_bytes():
    raise RuntimeError('radio admin addon mirror drift')
print('MAIN_WORKER_CANONICAL_AUTH_FALLBACK_V1_APPLIED')
