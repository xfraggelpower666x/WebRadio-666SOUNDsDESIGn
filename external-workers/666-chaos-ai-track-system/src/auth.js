import { json } from "./responses.js";

function getCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";").map(v => v.trim())) {
    const eq = part.indexOf("=");
    if (eq > -1 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return "";
}

export async function verifyAuth(request, env) {
  const verifyUrl = env.ADMIN_AUTH_VERIFY_URL || "https://666-system-auth.666soundsdesign-broadcaster.com/verify";
  const bearer = request.headers.get("authorization") || "";
  const cookieToken = getCookie(request, "chaos_auth") || getCookie(request, "admin_auth");
  const headers = bearer ? { authorization: bearer } : (cookieToken ? { authorization: `Bearer ${cookieToken}` } : {});
  try {
    const res = await fetch(verifyUrl, { headers });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && !!data.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

export async function requireAuth(request, env) {
  const auth = await verifyAuth(request, env);
  if (!auth.ok) return { response: json({ ok: false, error: "unauthorized", auth }, 401) };
  return { auth };
}
