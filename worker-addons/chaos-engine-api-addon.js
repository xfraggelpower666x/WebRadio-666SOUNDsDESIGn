/*
FILE: chaos-engine-api-addon.js
CREATED: 2026-05-15
MODIFIED: 2026-05-15
PURPOSE: Optional CHAOS_ENGINE V3 API addon.
CHANGE SUMMARY:
- /api/chaos-engine/track-generate
- /api/chaos-engine/storyline-generate
- /api/chaos-engine/visual-generate
- /api/chaos-engine/inlay-generate
- Auth via central auth worker.
- No secrets in frontend.
*/

function ceJson(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store" }
  });
}

function getCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";").map(v => v.trim())) {
    const eq = part.indexOf("=");
    if (eq > -1 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return "";
}

async function verifyChaosAuth(request, env) {
  const verifyUrl = env.CHAOS_AUTH_VERIFY_URL || "https://666-system-auth.666soundsdesign-broadcaster.com/verify";
  const token = getCookie(request, "chaos_auth");
  const res = await fetch(verifyUrl, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  if (!res.ok) return { ok:false, status:res.status };
  return res.json();
}

function extractJson(text) {
  try { return JSON.parse(text); } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch {}
    }
    return null;
  }
}

function systemPrompt(mode) {
  const common = [
    "You are the CHAOS MATRIX SAGA V3 production engine.",
    "Build living transmissions, not random tracks.",
    "Target: Suno 5.5 Pro Custom.",
    "No One-HTML assumptions; frontend is modular.",
    "Respect 4-codebox lock: title, stylePrompt, lyricPrompt, extendedPrompt.",
    "Style max 1000 chars, lyric max 5000 chars, extended max 800 chars.",
    "Title format: NUMBER - CHAOS MATRIX SAGA - TRACK TITLE. Use normal minus only.",
    "No phonetic spelling in title/style/extended. Phonetics only inside lyric prompt if needed.",
    "No screaming vocals. Controlled, understandable, hypnotic vocal delivery.",
    "142 BPM standard. Dark Techno / Psy-Techno / Psytrance / Industrial Cyberpunk / Cinematic Sci-Fi.",
    "DJ mixable, stable grid, fakeend 5:40-6:00, final convergence after 6:10, hard anti-loop ending.",
    "Use 5C, 6C, Guard Matrix, TSS, EETP, GMS, USG Prime when useful.",
    "Preserve the human core."
  ].join("\n");

  if (mode === "tracks") return common + "\nReturn ONLY JSON: {\"ok\":true,\"tracks\":[{\"title\":\"\",\"stylePrompt\":\"\",\"lyricPrompt\":\"\",\"extendedPrompt\":\"\"}]}";
  if (mode === "story") return common + "\nGenerate album storyline, chapter logic, character development, emotional arc and track-to-story synchronization. Return JSON: {\"ok\":true,\"text\":\"...\"}";
  if (mode === "visual") return common + "\nGenerate cover/artwork briefings: Front Cover A/B, Back Cover, Disc Artwork, Spine, MP3 artwork, posters, color DNA. Return JSON: {\"ok\":true,\"text\":\"...\"}";
  if (mode === "inlay") return common + "\nGenerate Recovered Transmission Archive: Welcome, Creator Origin, Lore, Freak Nation Manifest, Signal Theory, Experience Guide, Warnings, Final Transmission. Return JSON: {\"ok\":true,\"text\":\"...\"}";
  return common + "\nReturn JSON.";
}

async function callOpenAI(mode, payload, env) {
  if (!env.OPENAI_API_KEY) return { ok:false, error:"OPENAI_API_KEY missing" };
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization:`Bearer ${env.OPENAI_API_KEY}`, "content-type":"application/json" },
    body: JSON.stringify({
      model,
      input: [
        { role:"system", content: systemPrompt(mode) },
        { role:"user", content: JSON.stringify(payload, null, 2) }
      ],
      text: { format: { type: "json_object" } }
    })
  });

  const data = await res.json();
  if (!res.ok) return { ok:false, provider:"openai", model, status:res.status, error:data };

  const text = data.output_text || (Array.isArray(data.output) ? data.output.flatMap(x => x.content || []).map(c => c.text || "").join("") : "");
  const parsed = extractJson(text);
  if (!parsed) return { ok:false, error:"invalid_ai_json", raw:text };
  return { provider:"openai", model, ...parsed };
}

async function protectedCall(request, env, mode) {
  const auth = await verifyChaosAuth(request, env);
  if (!auth.ok) return ceJson({ ok:false, error:"unauthorized", auth }, 401);
  const payload = await request.json();
  return ceJson(await callOpenAI(mode, payload, env));
}

export async function handleChaosEngineApiAddon(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/api/chaos-engine/auth-status") {
    const auth = await verifyChaosAuth(request, env);
    return ceJson({ ok:!!auth.ok, auth });
  }

  if (url.pathname === "/api/chaos-engine/track-generate" && request.method === "POST") return protectedCall(request, env, "tracks");
  if (url.pathname === "/api/chaos-engine/storyline-generate" && request.method === "POST") return protectedCall(request, env, "story");
  if (url.pathname === "/api/chaos-engine/visual-generate" && request.method === "POST") return protectedCall(request, env, "visual");
  if (url.pathname === "/api/chaos-engine/inlay-generate" && request.method === "POST") return protectedCall(request, env, "inlay");

  return null;
}
