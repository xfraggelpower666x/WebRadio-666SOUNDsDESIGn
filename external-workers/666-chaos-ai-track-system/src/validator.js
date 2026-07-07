const LIMITS = { title: 80, stylePrompt: 1000, lyricPrompt: 5000, extendedPrompt: 800 };

function negativeScreamInstruction(text) {
  return /\b(?:no|without|avoid|never)\s+(?:uncontrolled\s+)?(?:screaming|shouting|scream|shout)(?:ing)?\b/i.test(text);
}

function positiveScreamInstruction(text) {
  const cleaned = String(text || "").replace(/\b(?:no|without|avoid|never)\s+(?:uncontrolled\s+)?(?:screaming|shouting|scream|shout)(?:ing)?\b/gi, "");
  return /\b(?:screaming|shouting|scream|shout)(?:ing)?\b/i.test(cleaned);
}

function cutAtBoundary(value, limit) {
  const text = String(value || "").trim();
  if (text.length <= limit) return text;
  const window = text.slice(0, limit + 1);
  const boundary = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(". "), window.lastIndexOf(", "), window.lastIndexOf("; "));
  return (boundary > Math.floor(limit * 0.65) ? window.slice(0, boundary + 1) : window.slice(0, limit)).trim();
}

function repairLyrics(value, limit) {
  let text = String(value || "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length <= limit) return text;

  const lines = text.split("\n");
  const structural = line => /^\s*[([]/.test(line) || /^\s*$/.test(line);
  const head = lines.slice(0, Math.ceil(lines.length * 0.7));
  const tail = lines.slice(Math.floor(lines.length * 0.85));
  const middleBudget = Math.max(0, limit - tail.join("\n").length - 40);
  let repairedHead = head.join("\n");
  if (repairedHead.length > middleBudget) {
    const selected = [];
    let used = 0;
    for (const line of head) {
      const candidate = line.length > 220 && !structural(line) ? `${line.slice(0, 217)}...` : line;
      if (used + candidate.length + 1 > middleBudget) break;
      selected.push(candidate);
      used += candidate.length + 1;
    }
    repairedHead = selected.join("\n");
  }
  text = `${repairedHead}\n\n[CONTROLLED COMPRESSION - FINAL LANDING PRESERVED]\n\n${tail.join("\n")}`.trim();
  return cutAtBoundary(text, limit);
}

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
  const all = `${stylePrompt}\n${lyricPrompt}\n${extendedPrompt}`;
  if (positiveScreamInstruction(all) && !negativeScreamInstruction(all)) warnings.push("Positive screaming/shouting instruction detected");

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

export function repairToLimits(track) {
  return {
    title: cutAtBoundary(String(track.title || "").replace(/[–—]/g, "-"), LIMITS.title),
    stylePrompt: cutAtBoundary(track.stylePrompt, LIMITS.stylePrompt),
    lyricPrompt: repairLyrics(track.lyricPrompt, LIMITS.lyricPrompt),
    extendedPrompt: cutAtBoundary(track.extendedPrompt, LIMITS.extendedPrompt)
  };
}
