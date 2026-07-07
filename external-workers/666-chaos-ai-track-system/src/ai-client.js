import { compileTrackPrompt, fallbackTrack } from "./prompt-compiler.js";

async function fetchWithTimeout(url, init = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function generateWithOpenAI(payload, env) {
  if (!env.OPENAI_API_KEY) {
    return { ok: true, source: "local-fallback-no-openai-key", tracks: [fallbackTrack(payload)] };
  }

  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-4.1-mini",
        input: compileTrackPrompt(payload),
        text: { format: { type: "json_object" } }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: "openai_failed", status: response.status };
    const text = data.output_text || "{}";
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, error: "invalid_ai_json" };
    }
  } catch (error) {
    return { ok: false, error: error?.name === "AbortError" ? "openai_timeout" : "openai_unreachable" };
  }
}
