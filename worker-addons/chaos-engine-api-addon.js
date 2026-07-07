/*
FILE: worker-addons/chaos-engine-api-addon.js
VERSION: 1.0.1
PURPOSE: Protected CHAOS_ENGINE API addon with bounded input and timeouts.
*/

const MAX_JSON_BYTES = 100 * 1024;

function ceJson(data, status = 200, extraHeaders = {}) {
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

function getCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";").map(value => value.trim())) {
    const eq = part.indexOf("=");
    if (eq > -1 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return "";
}

function bearer(request) {
  const value = String(request.headers.get("authorization") || "").trim();
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function verifyChaosAuth(request, env) {
  const verifyUrl = env.CHAOS_AUTH_VERIFY_URL || env.ADMIN_AUTH_VERIFY_URL || "https://666-system-auth.666soundsdesign-broadcaster.com/verify";
  const token = getCookie(request, "chaos_auth") || getCookie(request, "admin_auth") || bearer(request);
  if (!token) return { ok: false, error: "missing_auth" };
  try {
    const response = await fetchWithTimeout(verifyUrl, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      redirect: "error"
    }, 5000);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok && data?.ok === true, status: response.status };
  } catch (error) {
    return { ok: false, error: error?.name === "AbortError" ? "auth_timeout" : "auth_unreachable" };
  }
}

async function readBoundedJson(request) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) return { ok: false, response: ceJson({ ok: false, error: "content_type_must_be_json" }, 415) };
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_JSON_BYTES) return { ok: false, response: ceJson({ ok: false, error: "payload_too_large", maxBytes: MAX_JSON_BYTES }, 413) };
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    return { ok: false, response: ceJson({ ok: false, error: "payload_too_large", maxBytes: MAX_JSON_BYTES }, 413) };
  }
  try {
    return { ok: true, data: JSON.parse(text || "{}") };
  } catch {
    return { ok: false, response: ceJson({ ok: false, error: "invalid_json" }, 400) };
  }
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {}
    }
    return null;
  }
}

function systemPrompt(mode) {
  const common = [
    "You are the CHAOS MATRIX SAGA V3 production engine.",
    "Build living transmissions, not random tracks.",
    "Target: Suno 5.5 Pro Custom.",
    "Respect the four-field lock: title, stylePrompt, lyricPrompt, extendedPrompt.",
    "Title max 80 chars, style max 1000 chars, lyric max 5000 chars, extended max 800 chars.",
    "No phonetic spelling in title/style/extended. Phonetics only inside lyricPrompt when required.",
    "No uncontrolled screaming vocals. Keep vocals intelligible, controlled and hypnotic.",
    "Keep the selected genre hierarchy, DJ mixability, a stable low end and a conclusive anti-loop ending.",
    "Preserve the human core. Return valid JSON only."
  ].join("\n");

  if (mode === "tracks") return `${common}\nReturn: {"ok":true,"tracks":[{"title":"","stylePrompt":"","lyricPrompt":"","extendedPrompt":""}]}`;
  if (mode === "story") return `${common}\nReturn: {"ok":true,"text":"..."}`;
  if (mode === "visual") return `${common}\nReturn: {"ok":true,"text":"..."}`;
  if (mode === "inlay") return `${common}\nReturn: {"ok":true,"text":"..."}`;
  return common;
}

async function callOpenAI(mode, payload, env) {
  if (!env.OPENAI_API_KEY) return { ok: false, error: "openai_not_configured" };
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: systemPrompt(mode) },
          { role: "user", content: JSON.stringify(payload) }
        ],
        text: { format: { type: "json_object" } }
      })
    }, 30000);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: "openai_request_failed", status: response.status };
    const text = data.output_text || (Array.isArray(data.output)
      ? data.output.flatMap(item => item.content || []).map(content => content.text || "").join("")
      : "");
    const parsed = extractJson(text);
    if (!parsed) return { ok: false, error: "invalid_ai_json" };
    return { provider: "openai", model, ...parsed };
  } catch (error) {
    return { ok: false, error: error?.name === "AbortError" ? "openai_timeout" : "openai_unreachable" };
  }
}

async function protectedCall(request, env, mode) {
  const auth = await verifyChaosAuth(request, env);
  if (!auth.ok) return ceJson({ ok: false, error: "unauthorized" }, 401);
  const parsed = await readBoundedJson(request);
  if (!parsed.ok) return parsed.response;
  const result = await callOpenAI(mode, parsed.data, env);
  return ceJson(result, result.ok === false ? (result.error === "openai_not_configured" ? 503 : 502) : 200);
}

function methodNotAllowed(allowed) {
  return ceJson({ ok: false, error: "method_not_allowed", allowed }, 405, { allow: allowed.join(", ") });
}

export async function handleChaosEngineApiAddon(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/chaos-engine/")) return null;

  if (url.pathname === "/api/chaos-engine/auth-status") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    const auth = await verifyChaosAuth(request, env);
    return ceJson({ ok: Boolean(auth.ok) }, auth.ok ? 200 : 401);
  }

  const routes = new Map([
    ["/api/chaos-engine/track-generate", "tracks"],
    ["/api/chaos-engine/storyline-generate", "story"],
    ["/api/chaos-engine/visual-generate", "visual"],
    ["/api/chaos-engine/inlay-generate", "inlay"]
  ]);
  if (routes.has(url.pathname)) {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    return protectedCall(request, env, routes.get(url.pathname));
  }

  return ceJson({ ok: false, error: "not_found", path: url.pathname }, 404);
}
