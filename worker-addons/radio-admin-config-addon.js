/*
FILE: worker-addons/radio-admin-config-addon.js
VERSION: 1.1.0
PURPOSE: Canonical external-auth Worker broker, protected GitHub-backed radio runtime config and admin skip API.
SECURITY: Password only reaches the Password Worker through the same-origin login proxy. Runtime routes accept Bearer tokens only and fail closed.
*/

const DEFAULT_CONFIG_PATH = "config/radio-runtime.json";
const DEFAULT_BACKUP_DIR = "config/backups";
const RADIO_CONFIG_KV_KEY = "radio-runtime:current";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_AUTH_LOGIN_URL = "https://666-system-pw.666soundsdesign-broadcaster.com/login";
const DEFAULT_AUTH_VERIFY_URL = "https://666-system-auth.666soundsdesign-broadcaster.com/verify";
const EXPECTED_ISSUER = "666-system-pw";
const EXPECTED_SCOPE = "admin";

function adminJson(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...extraHeaders
    }
  });
}

function cleanText(value, max = 240) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function bearerToken(request) {
  const value = String(request.headers.get("authorization") || "").trim();
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(String(left || ""));
  const b = new TextEncoder().encode(String(right || ""));
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) diff |= (a[index] || 0) ^ (b[index] || 0);
  return diff === 0;
}

function expectedBrowserOrigin(request, env) {
  return String(env.ADMIN_SERVICE_ORIGIN || new URL(request.url).origin).replace(/\/$/, "");
}

function requestOriginEvidence(request) {
  const origin = String(request.headers.get("origin") || "").trim().replace(/\/$/, "");
  const referer = String(request.headers.get("referer") || "").trim();
  let refererOrigin = "";
  if (referer) {
    try { refererOrigin = new URL(referer).origin.replace(/\/$/, ""); } catch { return { origin, refererOrigin: "!invalid" }; }
  }
  return { origin, refererOrigin };
}

function browserOriginAllowed(request, env, requireEvidence = false) {
  const expected = expectedBrowserOrigin(request, env);
  const evidence = requestOriginEvidence(request);
  if (evidence.origin && evidence.origin !== expected) return false;
  if (evidence.refererOrigin && evidence.refererOrigin !== expected) return false;
  if (requireEvidence && !evidence.origin && !evidence.refererOrigin) return false;
  return true;
}

function serviceTokenValid(request, env) {
  const expected = String(env.ADMIN_SERVICE_TOKEN || "");
  const supplied = String(request.headers.get("x-service-token") || "");
  return Boolean(expected && supplied && constantTimeEqual(expected, supplied));
}

async function fetchWithTimeout(url, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function authServiceHeaders(env, token = "") {
  const headers = new Headers({
    accept: "application/json",
    "content-type": "application/json",
    "cache-control": "no-store",
    origin: String(env.ADMIN_SERVICE_ORIGIN || "https://webradio.666soundsdesign-broadcaster.com"),
    "x-service-token": String(env.ADMIN_SERVICE_TOKEN || ""),
    "x-auth-audience": String(env.AUTH_AUDIENCE || "")
  });
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
}

function claimAudience(payload) {
  if (Array.isArray(payload?.aud)) return payload.aud;
  if (payload?.aud !== undefined) return [payload.aud];
  if (payload?.audience !== undefined) return Array.isArray(payload.audience) ? payload.audience : [payload.audience];
  return [];
}

function validateVerifiedPayload(payload, env) {
  if (!payload || typeof payload !== "object") return { ok: false, error: "token_invalid" };
  if (payload.iss !== EXPECTED_ISSUER) return { ok: false, error: "issuer_rejected" };
  if (payload.scope !== EXPECTED_SCOPE) return { ok: false, error: "scope_rejected" };
  const exp = Number(payload.exp);
  if (!Number.isFinite(exp) || exp <= 0) return { ok: false, error: "token_invalid" };
  if (exp <= Math.floor(Date.now() / 1000)) return { ok: false, error: "token_expired" };
  const audience = String(env.AUTH_AUDIENCE || "");
  if (!audience || !claimAudience(payload).map(String).includes(audience)) return { ok: false, error: "audience_rejected" };
  return { ok: true, payload };
}

async function verifyTokenWithAuthWorker(token, env, source = "webradio-auth-check") {
  const verifyUrl = String(env.ADMIN_AUTH_VERIFY_URL || DEFAULT_AUTH_VERIFY_URL);
  if (!token) return { ok: false, error: "token_invalid" };
  if (!env.ADMIN_SERVICE_TOKEN || !env.AUTH_AUDIENCE || !env.ADMIN_SERVICE_ORIGIN) {
    return { ok: false, error: "service_auth_rejected" };
  }
  try {
    const response = await fetchWithTimeout(verifyUrl, {
      method: "POST",
      headers: authServiceHeaders(env, token),
      body: JSON.stringify({ audience: env.AUTH_AUDIENCE, source }),
      redirect: "error"
    }, 6000);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok !== true || data?.valid !== true) {
      return { ok: false, error: cleanText(data?.error || "token_invalid", 80), status: response.status };
    }
    return validateVerifiedPayload(data.payload, env);
  } catch (error) {
    return {
      ok: false,
      error: error?.name === "AbortError" ? "auth_verify_unreachable" : "auth_verify_unreachable"
    };
  }
}

export async function verifyStrictAdminRequest(request, env, source = "webradio-strict-admin") {
  const writeRequest = !["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase());
  const hasOriginEvidence = Boolean(request.headers.get("origin") || request.headers.get("referer"));
  const serviceRequest = serviceTokenValid(request, env);

  if (hasOriginEvidence && !browserOriginAllowed(request, env, true)) {
    return { ok: false, error: "origin_rejected", status: 403 };
  }
  if (writeRequest && !hasOriginEvidence && !serviceRequest) {
    return { ok: false, error: request.headers.get("x-service-token") ? "service_auth_rejected" : "origin_rejected", status: 403 };
  }
  if (!hasOriginEvidence && request.headers.get("x-service-token") && !serviceRequest) {
    return { ok: false, error: "service_auth_rejected", status: 403 };
  }

  const token = bearerToken(request);
  if (!token) return { ok: false, error: "token_invalid", status: 401 };
  const verified = await verifyTokenWithAuthWorker(token, env, source);
  if (!verified.ok) {
    const status = ["issuer_rejected", "scope_rejected", "audience_rejected"].includes(verified.error) ? 403 : 401;
    return { ...verified, status };
  }
  return { ok: true, payload: verified.payload, serviceRequest };
}

export async function requireStrictAdmin(request, env, source = "webradio-strict-admin") {
  const auth = await verifyStrictAdminRequest(request, env, source);
  if (auth.ok) return { ok: true, auth };
  return { ok: false, auth, response: adminJson({ ok: false, error: auth.error }, auth.status || 401) };
}

async function loginAdmin(request, env) {
  if (!browserOriginAllowed(request, env, true)) return adminJson({ ok: false, error: "origin_rejected" }, 403);
  if (!env.ADMIN_SERVICE_TOKEN || !env.AUTH_AUDIENCE || !env.ADMIN_SERVICE_ORIGIN) {
    return adminJson({ ok: false, error: "service_auth_rejected" }, 503);
  }

  let body;
  try { body = await request.json(); }
  catch { return adminJson({ ok: false, error: "invalid_json" }, 400); }
  const password = String(body?.password || "");
  if (!password) return adminJson({ ok: false, error: "password_rejected" }, 401);

  const loginUrl = String(env.ADMIN_AUTH_LOGIN_URL || DEFAULT_AUTH_LOGIN_URL);
  try {
    const response = await fetchWithTimeout(loginUrl, {
      method: "POST",
      headers: authServiceHeaders(env),
      body: JSON.stringify({
        password,
        audience: env.AUTH_AUDIENCE,
        source: "webradio-admin-login"
      }),
      redirect: "error"
    }, 7000);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok !== true || !data?.token) {
      const error = cleanText(data?.error || "password_rejected", 80);
      return adminJson({ ok: false, error: error === "password_rejected" ? error : "password_rejected" }, 401);
    }

    const verified = await verifyTokenWithAuthWorker(data.token, env, "webradio-login-token-check");
    if (!verified.ok) return adminJson({ ok: false, error: verified.error || "token_verification_failed" }, verified.status || 401);

    const expiresAt = Number(data.expiresAt ?? verified.payload.exp);
    if (!Number.isFinite(expiresAt) || expiresAt !== Number(verified.payload.exp)) {
      return adminJson({ ok: false, error: "token_verification_failed" }, 401);
    }

    return adminJson({
      ok: true,
      token: data.token,
      expiresAt,
      scope: verified.payload.scope,
      issuer: verified.payload.iss,
      audience: claimAudience(verified.payload)[0] || env.AUTH_AUDIENCE
    });
  } catch (error) {
    return adminJson({ ok: false, error: "pw_login_unreachable" }, 502);
  }
}

function requiredEnv(env) {
  return ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO", "GITHUB_BRANCH"].filter(key => !env[key]);
}

function githubHeaders(env) {
  return {
    authorization: `Bearer ${env.GITHUB_TOKEN}`,
    accept: "application/vnd.github+json",
    "content-type": "application/json",
    "user-agent": "666-radio-admin-config-addon-v1.0.1"
  };
}

function githubApi(env, path) {
  return `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
}

function b64encode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64decode(value) {
  const binary = atob(String(value || "").replace(/\n/g, ""));
  return new TextDecoder("utf-8").decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
}

function githubError(response, data) {
  return {
    ok: false,
    status: response.status,
    error: cleanText(data?.message || data?.error || `github_http_${response.status}`, 180)
  };
}

async function githubGetFile(env, path) {
  try {
    const response = await fetchWithTimeout(`${githubApi(env, path)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`, {
      headers: githubHeaders(env)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return githubError(response, data);
    return { ok: true, sha: data.sha, content: b64decode(data.content || ""), path: data.path };
  } catch (error) {
    return { ok: false, status: 0, error: error?.name === "AbortError" ? "github_timeout" : "github_unreachable" };
  }
}

async function githubPutFile(env, path, content, message, sha) {
  const body = { message, content: b64encode(content), branch: env.GITHUB_BRANCH };
  if (sha) body.sha = sha;
  try {
    const response = await fetchWithTimeout(githubApi(env, path), {
      method: "PUT",
      headers: githubHeaders(env),
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return githubError(response, data);
    return { ok: true, commit: data?.commit?.sha || null, path: data?.content?.path || path };
  } catch (error) {
    return { ok: false, status: 0, error: error?.name === "AbortError" ? "github_timeout" : "github_unreachable" };
  }
}

async function githubListDir(env, path) {
  try {
    const response = await fetchWithTimeout(`${githubApi(env, path)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`, {
      headers: githubHeaders(env)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return githubError(response, data);
    return {
      ok: true,
      items: Array.isArray(data)
        ? data.map(item => ({ name: item.name, path: item.path, sha: item.sha, size: item.size, type: item.type }))
        : []
    };
  } catch (error) {
    return { ok: false, status: 0, error: error?.name === "AbortError" ? "github_timeout" : "github_unreachable" };
  }
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function validHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return /^https?:$/.test(url.protocol);
  } catch {
    return false;
  }
}

function validatePayload(body) {
  const errors = [];
  const urlFields = [
    ["primaryStream", "Primary Stream"],
    ["backupStream", "Backup Stream"],
    ["emergencyStream", "Emergency Stream"]
  ];
  for (const [key, label] of urlFields) {
    const value = String(body[key] || "").trim();
    if (value && !validHttpUrl(value)) errors.push(`${label}: invalid http/https URL`);
  }
  for (const key of ["primaryStreams", "backupStreams", "emergencyStreams", "metadataUpstreams"]) {
    if (body[key] === undefined) continue;
    if (!Array.isArray(body[key])) {
      errors.push(`${key}: array required`);
      continue;
    }
    if (body[key].length > 12) errors.push(`${key}: maximum 12 entries`);
    for (const value of body[key]) if (!validHttpUrl(value)) errors.push(`${key}: invalid http/https URL`);
  }
  return errors;
}

async function requireAdmin(request, env, source = "webradio-admin-config") {
  const gate = await requireStrictAdmin(request, env, source);
  if (gate.response) return gate;
  const missing = requiredEnv(env);
  if (missing.length) return { response: adminJson({ ok: false, error: "missing_env", missing }, 503) };
  return gate;
}

async function requireAdminGate(request, env, source = "webradio-admin-action") {
  return requireStrictAdmin(request, env, source);
}

async function writeRuntimeKv(env, config) {
  if (!(env?.RADIO_CONFIG_KV && typeof env.RADIO_CONFIG_KV.put === "function")) return false;
  await env.RADIO_CONFIG_KV.put(RADIO_CONFIG_KV_KEY, JSON.stringify(config));
  return true;
}

function skipConfig(env = {}) {
  const adminUrl = env.SHOUTCAST_ADMIN_URL || env.SONICPANEL_SKIP_URL || env.MYIDJ_SKIP_URL || env.MYIDJ_ADMIN_URL || "";
  const username = env.SHOUTCAST_ADMIN_USER || env.MYIDJ_ADMIN_USER || "";
  const password = env.SHOUTCAST_ADMIN_PASSWORD || env.MYIDJ_ADMIN_PASSWORD || "";
  const token = env.SONICPANEL_SKIP_TOKEN || env.SKIP_ADMIN_TOKEN || "";
  return {
    configured: Boolean(adminUrl && (password || token)),
    adminUrl,
    username,
    password,
    token,
    sid: env.SHOUTCAST_SID || env.MYIDJ_STREAM_PORT || "1",
    mode: env.SHOUTCAST_SKIP_MODE || "nextsong",
    allowQuerySecret: String(env.SKIP_ALLOW_QUERY_SECRET || "").toLowerCase() === "true"
  };
}

async function performShoutcastSkip(env, source = "admin") {
  const config = skipConfig(env);
  if (!config.configured) return { ok: false, success: false, error: "skip_not_configured", configured: false };

  const url = new URL(config.adminUrl);
  if (!url.searchParams.has("mode")) url.searchParams.set("mode", config.mode);
  if (config.sid && !url.searchParams.has("sid")) url.searchParams.set("sid", String(config.sid));

  const headers = new Headers({ "cache-control": "no-store", "user-agent": "666soundsdesign-admin-skip-v1.0.1" });
  if (config.username && config.password) {
    headers.set("authorization", `Basic ${btoa(`${config.username}:${config.password}`)}`);
  } else if (config.token) {
    headers.set("authorization", `Bearer ${config.token}`);
    headers.set("x-api-token", config.token);
  }

  if (config.allowQuerySecret) {
    if (config.password && !url.searchParams.has("pass")) url.searchParams.set("pass", config.password);
    if (config.token && !url.searchParams.has("token")) url.searchParams.set("token", config.token);
  }

  try {
    const response = await fetchWithTimeout(url.toString(), { method: "GET", headers }, 7000);
    await response.arrayBuffer().catch(() => null);
    return {
      ok: response.ok,
      success: response.ok,
      status: response.status,
      source,
      configured: true,
      secretTransport: config.allowQuerySecret ? "header-and-explicit-query" : "header-only",
      message: response.ok ? "skip_sent" : "skip_upstream_failed"
    };
  } catch (error) {
    return {
      ok: false,
      success: false,
      configured: true,
      error: error?.name === "AbortError" ? "skip_timeout" : "skip_upstream_unreachable"
    };
  }
}

function cooldownKey(request) {
  const ip = cleanText(request.headers.get("cf-connecting-ip") || "unknown", 64);
  return new Request(`https://admin.local/skip-cooldown/${encodeURIComponent(ip)}`);
}

async function readSkipCooldown(request) {
  const key = cooldownKey(request);
  try {
    const cached = await caches.default.match(key);
    if (cached) return { key, data: await cached.json() };
  } catch {}
  return { key, data: { until: 0, updatedAt: 0 } };
}

async function writeSkipCooldown(key, until) {
  try {
    const ttl = Math.max(1, Math.ceil(Math.max(0, until - Date.now()) / 1000));
    await caches.default.put(key, new Response(JSON.stringify({ until, updatedAt: Date.now() }), {
      headers: { "content-type": "application/json", "cache-control": `public, max-age=${ttl}` }
    }));
  } catch {}
}

async function current(request, env) {
  const gate = await requireAdmin(request, env);
  if (gate.response) return gate.response;
  const path = env.GITHUB_CONFIG_PATH || DEFAULT_CONFIG_PATH;
  const currentFile = await githubGetFile(env, path);
  if (!currentFile.ok) return adminJson({ ok: false, error: "github_read_failed", status: currentFile.status }, 502);
  try {
    return adminJson({ ok: true, path, sha: currentFile.sha, config: JSON.parse(currentFile.content) });
  } catch {
    return adminJson({ ok: false, error: "config_json_invalid", path, sha: currentFile.sha }, 500);
  }
}

async function backups(request, env) {
  const gate = await requireAdmin(request, env);
  if (gate.response) return gate.response;
  const directory = env.GITHUB_BACKUP_DIR || DEFAULT_BACKUP_DIR;
  const result = await githubListDir(env, directory);
  return adminJson(result, result.ok ? 200 : 502);
}

function mergeConfig(oldConfig, body, backupPath, latestPath) {
  const next = {
    ...oldConfig,
    version: Number(oldConfig.version || 0) + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: "radio-player-admin-overlay",
    updateNote: cleanText(body.note || "Admin overlay stream config update", 300),
    previousBackup: backupPath,
    latestBackup: latestPath
  };

  for (const key of ["primaryStream", "backupStream", "emergencyStream"]) {
    if (body[key] !== undefined) next[key] = String(body[key] || "").trim();
  }
  for (const key of ["primaryStreams", "backupStreams", "emergencyStreams", "metadataUpstreams"]) {
    if (Array.isArray(body[key])) next[key] = body[key].map(value => String(value).trim()).filter(Boolean);
  }
  if (next.primaryStream && !Array.isArray(next.primaryStreams)) next.primaryStreams = [next.primaryStream];
  if (next.backupStream && !Array.isArray(next.backupStreams)) next.backupStreams = [next.backupStream];
  if (next.emergencyStream && !Array.isArray(next.emergencyStreams)) next.emergencyStreams = [next.emergencyStream];
  return next;
}

async function update(request, env) {
  const gate = await requireAdmin(request, env);
  if (gate.response) return gate.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return adminJson({ ok: false, error: "invalid_json" }, 400);
  }
  const errors = validatePayload(body);
  if (errors.length) return adminJson({ ok: false, error: "validation_failed", errors }, 400);

  const configPath = env.GITHUB_CONFIG_PATH || DEFAULT_CONFIG_PATH;
  const backupDir = env.GITHUB_BACKUP_DIR || DEFAULT_BACKUP_DIR;
  const currentFile = await githubGetFile(env, configPath);
  if (!currentFile.ok) return adminJson({ ok: false, error: "github_read_failed", status: currentFile.status }, 502);

  let oldConfig;
  try {
    oldConfig = JSON.parse(currentFile.content);
  } catch {
    return adminJson({ ok: false, error: "current_config_invalid_json" }, 500);
  }

  const time = stamp();
  const backupPath = `${backupDir}/radio-runtime.${time}.back.json`;
  const latestPath = `${backupDir}/radio-runtime.latest.back.json`;
  const backup = await githubPutFile(env, backupPath, currentFile.content, `backup: ${configPath} ${time}`);
  if (!backup.ok) return adminJson({ ok: false, error: "backup_failed", status: backup.status }, 502);

  const latest = await githubGetFile(env, latestPath);
  const latestBackup = await githubPutFile(env, latestPath, currentFile.content, "backup: update latest radio runtime backup", latest.ok ? latest.sha : undefined);
  if (!latestBackup.ok) return adminJson({ ok: false, error: "latest_backup_failed", status: latestBackup.status }, 502);

  const next = mergeConfig(oldConfig, body, backupPath, latestPath);
  const serialized = `${JSON.stringify(next, null, 2)}\n`;
  const written = await githubPutFile(env, configPath, serialized, `admin: update radio runtime config v${next.version}`, currentFile.sha);
  if (!written.ok) return adminJson({ ok: false, error: "config_update_failed", status: written.status }, 502);

  const kvActivated = await writeRuntimeKv(env, next).catch(() => false);
  return adminJson({
    ok: true,
    accepted: true,
    effectiveImmediately: kvActivated,
    deploymentPending: !kvActivated,
    configPath,
    backupPath,
    latestBackupPath: latestPath,
    version: next.version,
    commit: written.commit,
    readback: "/api/runtime-config/status",
    note: kvActivated
      ? "Runtime KV updated and GitHub backup committed. Verify the readback endpoint."
      : "GitHub commit accepted. The active Worker changes only after Cloudflare auto-deploy and readback verification."
  }, kvActivated ? 200 : 202);
}

async function rollback(request, env) {
  const gate = await requireAdmin(request, env);
  if (gate.response) return gate.response;

  const configPath = env.GITHUB_CONFIG_PATH || DEFAULT_CONFIG_PATH;
  const backupDir = env.GITHUB_BACKUP_DIR || DEFAULT_BACKUP_DIR;
  const latestPath = `${backupDir}/radio-runtime.latest.back.json`;
  const currentFile = await githubGetFile(env, configPath);
  if (!currentFile.ok) return adminJson({ ok: false, error: "current_read_failed", status: currentFile.status }, 502);
  const latest = await githubGetFile(env, latestPath);
  if (!latest.ok) return adminJson({ ok: false, error: "latest_backup_read_failed", status: latest.status }, 502);

  let restoredConfig;
  try {
    restoredConfig = JSON.parse(latest.content);
  } catch {
    return adminJson({ ok: false, error: "backup_json_invalid" }, 500);
  }
  restoredConfig.version = Number(restoredConfig.version || 0) + 1;
  restoredConfig.updatedAt = new Date().toISOString();
  restoredConfig.updatedBy = "radio-player-admin-rollback";
  const serialized = `${JSON.stringify(restoredConfig, null, 2)}\n`;
  const restored = await githubPutFile(env, configPath, serialized, `rollback: restore ${configPath} from latest backup`, currentFile.sha);
  if (!restored.ok) return adminJson({ ok: false, error: "rollback_failed", status: restored.status }, 502);

  const kvActivated = await writeRuntimeKv(env, restoredConfig).catch(() => false);
  return adminJson({
    ok: true,
    accepted: true,
    effectiveImmediately: kvActivated,
    deploymentPending: !kvActivated,
    restoredFrom: latestPath,
    configPath,
    commit: restored.commit,
    version: restoredConfig.version,
    readback: "/api/runtime-config/status"
  }, kvActivated ? 200 : 202);
}

async function adminSkip(request, env) {
  const gate = await requireAdminGate(request, env, "webradio-admin-skip");
  if (gate.response) return gate.response;
  const cooldownMs = Math.max(3000, Number(env.ADMIN_SKIP_COOLDOWN_MS) || 12000);
  const cooldown = await readSkipCooldown(request);
  const remainingMs = Math.max(0, Number(cooldown.data.until || 0) - Date.now());
  if (remainingMs > 0) return adminJson({ ok: false, error: "cooldown_active", remainingMs, cooldownMs }, 429);

  const result = await performShoutcastSkip(env, "admin-player");
  if (!result.ok) return adminJson(result, 502);
  const until = Date.now() + cooldownMs;
  await writeSkipCooldown(cooldown.key, until);
  return adminJson({ ...result, cooldownMs, cooldownUntil: new Date(until).toISOString() });
}

async function adminServicesHealth(request, env) {
  const gate = await requireStrictAdmin(request, env, "webradio-admin-services-health");
  if (gate.response) return gate.response;
  const serviceHeaders = authServiceHeaders(env);
  serviceHeaders.delete("authorization");
  async function check(label, endpoint) {
    try {
      const url = new URL(endpoint);
      url.pathname = "/health";
      url.search = "";
      const response = await fetchWithTimeout(url.toString(), { method: "GET", headers: serviceHeaders, redirect: "error" }, 5000);
      return { label, reachable: response.ok, status: response.status, authorization: false };
    } catch {
      return { label, reachable: false, status: 0, authorization: false };
    }
  }
  return adminJson({
    ok: true,
    note: "Health proves reachability only; it is never an authorization result.",
    passwordWorker: await check("password-worker", env.ADMIN_AUTH_LOGIN_URL || DEFAULT_AUTH_LOGIN_URL),
    authWorker: await check("auth-worker", env.ADMIN_AUTH_VERIFY_URL || DEFAULT_AUTH_VERIFY_URL)
  });
}

async function debugStatus(request, env) {
  const gate = await requireStrictAdmin(request, env, "webradio-admin-debug");
  if (gate.response) return adminJson({ ok: false, error: "not_found" }, 404);
  return adminJson({
    ok: true,
    service: "radio-admin-config-addon",
    authMode: env.AUTH_MODE || "external_auth_worker",
    issuer: EXPECTED_ISSUER,
    audienceConfigured: Boolean(env.AUTH_AUDIENCE),
    serviceOriginConfigured: Boolean(env.ADMIN_SERVICE_ORIGIN),
    serviceTokenConfigured: Boolean(env.ADMIN_SERVICE_TOKEN),
    githubConfigured: requiredEnv(env).length === 0,
    configPath: env.GITHUB_CONFIG_PATH || DEFAULT_CONFIG_PATH,
    backupDir: env.GITHUB_BACKUP_DIR || DEFAULT_BACKUP_DIR,
    authVerifyConfigured: Boolean(env.ADMIN_AUTH_VERIFY_URL),
    pwLoginConfigured: Boolean(env.ADMIN_AUTH_LOGIN_URL),
    runtimeKvConfigured: Boolean(env.RADIO_CONFIG_KV),
    skipConfigured: skipConfig(env).configured
  });
}

function methodNotAllowed(allowed) {
  return adminJson({ ok: false, error: "method_not_allowed", allowed }, 405, { allow: allowed.join(", ") });
}

export async function handleRadioAdminConfigAddon(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/api/admin/debug") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return debugStatus(request, env);
  }
  if (url.pathname === "/api/admin/login") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    return loginAdmin(request, env);
  }
  if (url.pathname === "/api/admin/auth-check" || url.pathname === "/api/admin/gate-check") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const gate = await requireStrictAdmin(request, env, "webradio-admin-auth-check");
    if (gate.response) return gate.response;
    return adminJson({
      ok: true,
      valid: true,
      authOk: true,
      pwOk: true,
      issuer: gate.auth.payload.iss,
      scope: gate.auth.payload.scope,
      exp: gate.auth.payload.exp
    });
  }
  if (url.pathname === "/api/admin/services/health") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return adminServicesHealth(request, env);
  }
  if (url.pathname === "/api/admin/skip") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    return adminSkip(request, env);
  }
  if (url.pathname === "/api/admin/config/current") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return current(request, env);
  }
  if (url.pathname === "/api/admin/config/backups") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return backups(request, env);
  }
  if (url.pathname === "/api/admin/config/update") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    return update(request, env);
  }
  if (url.pathname === "/api/admin/config/rollback") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    return rollback(request, env);
  }

  return null;
}
