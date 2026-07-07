/*
FILE: worker-addons/radio-admin-config-addon.js
VERSION: 1.0.1
PURPOSE: Protected GitHub-backed radio runtime config and admin skip API.
SECURITY: No secrets in URLs unless SKIP_ALLOW_QUERY_SECRET=true is explicitly set.
*/

const DEFAULT_CONFIG_PATH = "config/radio-runtime.json";
const DEFAULT_BACKUP_DIR = "config/backups";
const RADIO_CONFIG_KV_KEY = "radio-runtime:current";
const DEFAULT_TIMEOUT_MS = 8000;

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

function getCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";").map(value => value.trim())) {
    const eq = part.indexOf("=");
    if (eq > -1 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return "";
}

function bearerToken(request) {
  const value = String(request.headers.get("authorization") || "").trim();
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

function sameOriginEvidence(request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = String(request.headers.get("origin") || "").trim();
  const referer = String(request.headers.get("referer") || "").trim();
  const fetchSite = String(request.headers.get("sec-fetch-site") || "").trim().toLowerCase();

  if (origin) return { present: true, ok: origin === requestOrigin, source: "origin" };
  if (referer) {
    try {
      return { present: true, ok: new URL(referer).origin === requestOrigin, source: "referer" };
    } catch {
      return { present: true, ok: false, source: "referer" };
    }
  }
  if (fetchSite) {
    return { present: true, ok: fetchSite === "same-origin", source: "sec-fetch-site" };
  }
  return { present: false, ok: false, source: "none" };
}

function isSameOrigin(request, options = {}) {
  const evidence = sameOriginEvidence(request);
  if (evidence.present) return evidence.ok;
  return options.requireEvidence !== true;
}

function normalizeAdminError(value, fallback = "request_rejected") {
  const raw = cleanText(value || fallback, 120).toLowerCase();
  const map = [
    [/invalid password|password rejected|login rejected/, "password_rejected"],
    [/worker secrets missing|secret.*missing/, "worker_secrets_missing"],
    [/invalid signature|signature invalid/, "token_signature_invalid"],
    [/token expired|expired token/, "token_expired"],
    [/invalid scope|scope invalid/, "scope_invalid"],
    [/invalid issuer|issuer invalid/, "issuer_invalid"],
    [/token missing|auth_token_missing/, "auth_token_missing"],
    [/token malformed|malformed token/, "token_malformed"],
    [/invalid payload|payload invalid/, "token_payload_invalid"],
    [/origin/, "origin_rejected"],
    [/timeout/, "upstream_timeout"],
    [/unreachable/, "upstream_unreachable"]
  ];
  for (const [pattern, code] of map) if (pattern.test(raw)) return code;
  return raw.replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || fallback;
}

function adminServiceHeaders(env, base = {}) {
  const headers = new Headers(base);
  const serviceOrigin = String(env?.ADMIN_SERVICE_ORIGIN || env?.PUBLIC_PLAYER_ORIGIN || "").trim();
  const serviceToken = String(env?.ADMIN_SERVICE_TOKEN || "").trim();
  if (serviceOrigin) headers.set("origin", serviceOrigin.replace(/\/$/, ""));
  if (serviceToken) headers.set("x-admin-service-token", serviceToken);
  return headers;
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

function verificationHeaders(request, token) {
  const headers = new Headers({ accept: "application/json", "cache-control": "no-store" });
  const incoming = request.headers.get("authorization");
  if (incoming) headers.set("authorization", incoming);
  else if (token) headers.set("authorization", `Bearer ${token}`);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  return headers;
}

export async function fetchVerification(url, token, label, env = {}) {
  try {
    const headers = adminServiceHeaders(env, {
      accept: "application/json",
      "content-type": "application/json",
      "cache-control": "no-store",
      authorization: `Bearer ${token}`
    });
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ token }),
      redirect: "error"
    }, 5000);
    const data = await response.json().catch(() => ({}));
    const payload = data && typeof data.payload === "object" ? data.payload : null;
    const valid = response.ok && data?.ok === true && data?.valid === true && Boolean(payload);
    return {
      ok: valid,
      status: response.status,
      service: label,
      payload,
      error: valid ? null : normalizeAdminError(data?.error, "verification_rejected")
    };
  } catch (error) {
    return {
      ok: false,
      service: label,
      payload: null,
      error: error?.name === "AbortError" ? "verification_timeout" : "verification_unreachable"
    };
  }
}

export async function verifyAdminAuth(request, env) {
  const verifyUrl = env.ADMIN_AUTH_VERIFY_URL || "https://666-system-auth.666soundsdesign-broadcaster.com/verify";
  const token = getCookie(request, "chaos_auth") || getCookie(request, "admin_auth") || bearerToken(request);
  if (!token) return { ok: false, service: "auth", payload: null, error: "auth_token_missing" };
  return fetchVerification(verifyUrl, token, "auth", env);
}

export function verifyPwIssuedToken(auth) {
  const payload = auth?.payload || null;
  if (!auth?.ok) {
    return { ok: false, service: "password", payload, error: auth?.error || "auth_invalid" };
  }
  if (!payload || typeof payload !== "object") {
    return { ok: false, service: "password", payload, error: "token_payload_missing" };
  }
  if (payload.iss !== "666-system-pw") {
    return { ok: false, service: "password", payload, error: "issuer_invalid" };
  }
  if (payload.scope !== "admin") {
    return { ok: false, service: "password", payload, error: "scope_invalid" };
  }
  const exp = Number(payload.exp || 0);
  if (!exp || exp <= Math.floor(Date.now() / 1000)) {
    return { ok: false, service: "password", payload, error: "token_expired" };
  }
  return { ok: true, service: "password", payload, error: null };
}


async function loginAdmin(request, env) {
  if (!isSameOrigin(request, { requireEvidence: true })) return adminJson({ ok: false, error: "origin_rejected" }, 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return adminJson({ ok: false, error: "invalid_json" }, 400);
  }
  const password = String(body?.password || "");
  if (!password) return adminJson({ ok: false, error: "password_missing" }, 400);

  const loginUrl = env.PW_LOGIN_URL || env.ADMIN_AUTH_LOGIN_URL || "https://666-system-pw.666soundsdesign-broadcaster.com/login";
  try {
    const response = await fetchWithTimeout(loginUrl, {
      method: "POST",
      headers: adminServiceHeaders(env, {
        accept: "application/json",
        "content-type": "application/json",
        "cache-control": "no-store"
      }),
      body: JSON.stringify({ password }),
      redirect: "error"
    }, 7000);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok !== true || !data?.token) {
      return adminJson({ ok: false, error: normalizeAdminError(data?.error, "login_rejected") }, response.status || 401);
    }

    const verifyUrl = env.ADMIN_AUTH_VERIFY_URL || "https://666-system-auth.666soundsdesign-broadcaster.com/verify";
    const verified = await fetchVerification(verifyUrl, data.token, "auth", env);
    const pw = verifyPwIssuedToken(verified);
    if (!pw.ok) return adminJson({ ok: false, error: pw.error || verified.error || "token_verification_failed" }, 401);

    return adminJson({
      ok: true,
      token: data.token,
      expiresAt: data.expiresAt || verified?.payload?.exp || null,
      scope: verified?.payload?.scope || "admin",
      issuer: verified?.payload?.iss || "666-system-pw"
    });
  } catch (error) {
    return adminJson({
      ok: false,
      error: error?.name === "AbortError" ? "pw_login_timeout" : "pw_login_unreachable"
    }, 502);
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

async function requireAdminGate(request, env, options = {}) {
  if (options.requireWriteOrigin && !isSameOrigin(request, { requireEvidence: true })) {
    return { response: adminJson({ ok: false, error: "origin_rejected" }, 403) };
  }
  const auth = await verifyAdminAuth(request, env);
  if (!auth.ok) {
    return { response: adminJson({ ok: false, error: auth.error || "unauthorized" }, 401) };
  }
  const pw = verifyPwIssuedToken(auth);
  if (!pw.ok) {
    return { response: adminJson({ ok: false, error: pw.error || "password_verification_failed" }, 403) };
  }
  if (options.requireGithub) {
    const missing = requiredEnv(env);
    if (missing.length) return { response: adminJson({ ok: false, error: "missing_env", missing }, 503) };
  }
  return { auth, pw };
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
  const gate = await requireAdminGate(request, env, { requireGithub: true });
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
  const gate = await requireAdminGate(request, env, { requireGithub: true });
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
  const gate = await requireAdminGate(request, env, { requireGithub: true, requireWriteOrigin: true });
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
  const gate = await requireAdminGate(request, env, { requireGithub: true, requireWriteOrigin: true });
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
  const gate = await requireAdminGate(request, env, { requireWriteOrigin: true });
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

async function debugStatus(request, env) {
  const gate = await requireAdminGate(request, env);
  if (gate.response) return adminJson({ ok: false, error: "not_found" }, 404);
  return adminJson({
    ok: true,
    service: "radio-admin-config-addon",
    githubConfigured: requiredEnv(env).length === 0,
    configPath: env.GITHUB_CONFIG_PATH || DEFAULT_CONFIG_PATH,
    backupDir: env.GITHUB_BACKUP_DIR || DEFAULT_BACKUP_DIR,
    authVerifyConfigured: Boolean(env.ADMIN_AUTH_VERIFY_URL),
    pwLoginConfigured: Boolean(env.PW_LOGIN_URL || env.ADMIN_AUTH_LOGIN_URL || "https://666-system-pw.666soundsdesign-broadcaster.com/login"),
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
  if (url.pathname === "/api/admin/auth-check") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const auth = await verifyAdminAuth(request, env);
    const pw = verifyPwIssuedToken(auth);
    return adminJson(
      { ok: Boolean(auth.ok && pw.ok), authOk: Boolean(auth.ok), pwOk: Boolean(pw.ok), error: pw.ok ? null : (pw.error || auth.error || "unauthorized") },
      auth.ok && pw.ok ? 200 : 403
    );
  }
  if (url.pathname === "/api/admin/gate-check") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const auth = await verifyAdminAuth(request, env);
    const pw = verifyPwIssuedToken(auth);
    return adminJson(
      { ok: Boolean(auth.ok && pw.ok), authOk: Boolean(auth.ok), pwOk: Boolean(pw.ok), error: pw.ok ? null : (pw.error || auth.error || "unauthorized") },
      auth.ok && pw.ok ? 200 : 403
    );
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
