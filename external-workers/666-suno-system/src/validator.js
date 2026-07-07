export function validateSunoPayload(payload) {
  const warnings = [];
  if (!payload.title) warnings.push("title missing");
  if (!payload.stylePrompt) warnings.push("stylePrompt missing");
  if (!payload.lyricPrompt) warnings.push("lyricPrompt missing");
  if (String(payload.stylePrompt || "").length > 1000) warnings.push("stylePrompt > 1000");
  if (String(payload.lyricPrompt || "").length > 5000) warnings.push("lyricPrompt > 5000");
  if (String(payload.extendedPrompt || "").length > 800) warnings.push("extendedPrompt > 800");
  return { ok: warnings.length === 0, warnings };
}
