import { compileTrackPrompt, fallbackTrack } from "./prompt-compiler.js";

export async function generateWithOpenAI(payload, env) {
  if (!env.OPENAI_API_KEY) {
    return { ok: true, source: "local-fallback-no-openai-key", tracks: [fallbackTrack(payload)] };
  }

  const prompt = compileTrackPrompt(payload);
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
      text: { format: { type: "json_object" } }
    })
  });

  const data = await res.json();
  if (!res.ok) return { ok: false, error: "openai_failed", detail: data };
  const text = data.output_text || "{}";
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid_ai_json", raw: text };
  }
}
