export function compileTrackPrompt(payload) {
  return `You are the 666 Chaos AI Track System.

Return JSON only:
{
  "ok": true,
  "tracks": [
    {
      "title": "...",
      "stylePrompt": "...",
      "lyricPrompt": "...",
      "extendedPrompt": "..."
    }
  ]
}

Rules:
- Suno 5.5 Pro Custom.
- Title max 80 chars.
- Style max 1000 chars.
- Lyric max 5000 chars.
- Extended max 800 chars.
- No screaming vocals.
- Use 6C, 5C, TSS, GMS, USG PRIME, Orchester Guard.
- Create living transmissions, not generic songs.
- Parentheses for structure/timing only.
- Square brackets for FX/SFX/voices.

Payload:
${JSON.stringify(payload, null, 2)}`;
}

export function fallbackTrack(payload) {
  const title = String(payload.trackTitle || payload.title || "Living Transmission").replace(/[–—]/g, "-");
  const rawIdea = String(payload.rawIdea || payload.concept || payload.idea || "The human signal enters the pressure field.");
  const emotion = String(payload.emotion || "controlled pressure");
  return {
    title,
    stylePrompt: `Dark Techno, Psy-Techno, Industrial Cyberpunk, 142 BPM, ${emotion}, giant sub pressure, rolling bassline, cinematic atmosphere, controlled vocal clarity, DJ mixable, no generic EDM, no screaming vocals.`,
    lyricPrompt: `(0:00–0:32 | INTRO | ATMOSPHERE SEED)
[low bunker air]
[heartbeat hidden under sub pressure]

(0:32–1:40 | CORE SIGNAL)
${rawIdea}

(1:40–3:30 | CONTROLLED ESCALATION)
[rolling bassline]
[industrial percussion]
The signal does not disappear.

(3:30–4:50 | MAIN PRESSURE)
[giant sub pressure]
[psy-techno motion]

(4:50–5:40 | HUMAN RECALL)
[warm human exhale]
[heartbeat returns]

(5:40–6:00 | FAKEEND WINDOW)
[near silence]

(6:00–6:45 | FINAL CONVERGENCE)
Stop.
[hard cut termination]`,
    extendedPrompt: "Preserve human core. No screaming vocals. Use fakeend between 5:40–6:00. Reactivation after fakeend. Final convergence after 6:10. Hard cut ending, no fade collapse, no endless loop."
  };
}
