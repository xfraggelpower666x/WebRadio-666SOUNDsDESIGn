const audio = document.getElementById("audio");

if (audio && !window._audioCtx) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const src = ctx.createMediaElementSource(audio);

  const analyser = ctx.createAnalyser();
  src.connect(analyser);
  analyser.connect(ctx.destination);

  window._audioCtx = ctx;
  window._analyser = analyser;
}