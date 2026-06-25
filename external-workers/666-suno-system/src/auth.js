import { json } from "./responses.js";

function getCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";").map(value => value.trim())) {
    const eq = part.indexOf("=");
    if (eq > -1 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return "";
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "error" });
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyAuth(request, env) {
  const verifyUrl = env.ADMIN_AUTH_VERIFY_URL || "https://666-system-auth.666soundsdesign-broadcaster.com/verify";
  const bearer = request.headers.get("authorization") || "";
  const cookieToken = getCookie(request, "chaos_auth") || getCookie(request, "admin_auth");
  const headers = bearer ? { authorization: bearer } : (cookieToken ? { authorization: `Bearer ${cookieToken}` } : null);
  if (!headers) return { ok: false, error: "missing_auth" };
  try {
    const response = await fetchWithTimeout(verifyUrl, { headers });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok && Boolean(data.ok), status: response.status };
  } catch (error) {
    return { ok: false, error: error?.name === "AbortError" ? "auth_timeout" : "auth_unreachable" };
  }
}

export async function requireAuth(request, env) {
  const auth = await verifyAuth(request, env);
  if (!auth.ok) return { response: json(request, env, { ok: false, error: "unauthorized" }, 401) };
  return { auth };
}
