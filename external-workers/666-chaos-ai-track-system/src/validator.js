const LIMITS = { title: 80, stylePrompt: 1000, lyricPrompt: 5000, extendedPrompt: 800 };

export function validateTrack(track) {
  const warnings = [];
  const title = String(track.title || "");
  const stylePrompt = String(track.stylePrompt || "");
  const lyricPrompt = String(track.lyricPrompt || "");
  const extendedPrompt = String(track.extendedPrompt || "");

  if (title.length > LIMITS.title) warnings.push(`Title > ${LIMITS.title}`);
  if (stylePrompt.length > LIMITS.stylePrompt) warnings.push(`Style > ${LIMITS.stylePrompt}`);
  if (lyricPrompt.length > LIMITS.lyricPrompt) warnings.push(`Lyric > ${LIMITS.lyricPrompt}`);
  if (extendedPrompt.length > LIMITS.extendedPrompt) warnings.push(`Extended > ${LIMITS.extendedPrompt}`);
  if (/[–—]/.test(title)) warnings.push("Title uses long dash");
  if (/screaming|shouting|scream|shout/i.test(stylePrompt + lyricPrompt + extendedPrompt)) warnings.push("No screaming/shouting instruction allowed");

  return {
    ok: warnings.length === 0,
    warnings,
    counts: {
      title: title.length,
      style: stylePrompt.length,
      lyric: lyricPrompt.length,
      extended: extendedPrompt.length
    }
  };
}

export function truncateToLimits(track) {
  return {
    title: String(track.title || "").replace(/[–—]/g, "-").slice(0, LIMITS.title),
    stylePrompt: String(track.stylePrompt || "").slice(0, LIMITS.stylePrompt),
    lyricPrompt: String(track.lyricPrompt || "").slice(0, LIMITS.lyricPrompt),
    extendedPrompt: String(track.extendedPrompt || "").slice(0, LIMITS.extendedPrompt)
  };
}
