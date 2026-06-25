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

function isSameOrigin(request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = String(request.headers.get("origin") || "").trim();
  const referer = String(request.headers.get("referer") || "").trim();
  if (origin && origin !== requestOrigin) return false;
  if (referer) {
    try {
      if (new URL(referer).origin !== requestOrigin) return false;
    } catch {
      return false;
    }
  }
  return true;
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

async function fetchVerification(url, headers, label) {
  try {
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers,
      redirect: "error"
    }, 5000);
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok && data && data.ok === true,
      status: response.status,
      service: label,
      error: response.ok ? null : cleanText(data?.error || "verification_rejected", 80)
    };
  } catch (error) {
    return {
      ok: false,
      service: label,
      error: error?.name === "AbortError" ? "verification_timeout" : "verification_unreachable"
    };
  }
}

async function verifyAdminAuth(request, env) {
  const verifyUrl = env.ADMIN_AUTH_VERIFY_URL || "https://666-system-auth.666soundsdesign-broadcaster.com/verify";
  const token = getCookie(request, "chaos_auth") || getCookie(request, "admin_auth") || bearerToken(request);
  if (!token && !request.headers.get("authorization")) return { ok: false, service: "auth", error: "auth_token_missing" };
  return fetchVerification(verifyUrl, verificationHeaders(request, token), "auth");
}

async function verifyPwWorker(request, env) {
  const verifyUrl = env.PW_VERIFY_URL;
  if (!verifyUrl) return { ok: false, service: "password", error: "pw_verify_not_configured" };
  const token = getCookie(request, "pw_auth") || getCookie(request, "admin_auth") || getCookie(request, "chaos_auth") || bearerToken(request);
  if (!token && !request.headers.get("authorization")) return { ok: false, service: "password", error: "pw_token_missing" };
  return fetchVerification(verifyUrl, verificationHeaders(request, token), "password");
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

async function requireAdmin(request, env) {
  const auth = await verifyAdminAuth(request, env);
  if (!auth.ok) return { response: adminJson({ ok: false, error: "unauthorized" }, 401) };
  const missing = requiredEnv(env);
  if (missing.length) return { response: adminJson({ ok: false, error: "missing_env", missing }, 503) };
  return { auth };
}

async function requireAdminGate(request, env) {
  if (!isSameOrigin(request)) return { response: adminJson({ ok: false, error: "origin_rejected" }, 403) };
  const auth = await verifyAdminAuth(request, env);
  if (!auth.ok) return { response: adminJson({ ok: false, error: "unauthorized" }, 401) };
  const pw = await verifyPwWorker(request, env);
  if (!pw.ok) return { response: adminJson({ ok: false, error: "password_verification_failed" }, 403) };
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
  if (!isSameOrigin(request)) return adminJson({ ok: false, error: "origin_rejected" }, 403);

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
  if (!isSameOrigin(request)) return adminJson({ ok: false, error: "origin_rejected" }, 403);

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
  const gate = await requireAdminGate(request, env);
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
  const auth = await verifyAdminAuth(request, env);
  if (!auth.ok) return adminJson({ ok: false, error: "not_found" }, 404);
  return adminJson({
    ok: true,
    service: "radio-admin-config-addon",
    githubConfigured: requiredEnv(env).length === 0,
    configPath: env.GITHUB_CONFIG_PATH || DEFAULT_CONFIG_PATH,
    backupDir: env.GITHUB_BACKUP_DIR || DEFAULT_BACKUP_DIR,
    authVerifyConfigured: Boolean(env.ADMIN_AUTH_VERIFY_URL),
    pwVerifyConfigured: Boolean(env.PW_VERIFY_URL),
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
  if (url.pathname === "/api/admin/auth-check") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const auth = await verifyAdminAuth(request, env);
    return adminJson({ ok: Boolean(auth.ok) }, auth.ok ? 200 : 401);
  }
  if (url.pathname === "/api/admin/gate-check") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const auth = await verifyAdminAuth(request, env);
    const pw = auth.ok ? await verifyPwWorker(request, env) : { ok: false };
    return adminJson({ ok: Boolean(auth.ok && pw.ok), authOk: Boolean(auth.ok), pwOk: Boolean(pw.ok) }, auth.ok && pw.ok ? 200 : 403);
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
