export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("OK", {
        status: 200,
        headers: { "content-type": "text/plain; charset=UTF-8" }
      });
    }

    if (url.pathname === "/api/nowplaying") {
      const upstream = "https://my.idjstream.com/cp/get_info.php?p=8686";
      try {
        const res = await fetch(upstream, {
          headers: { "cache-control": "no-store" }
        });
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: {
            "content-type": res.headers.get("content-type") || "application/json; charset=UTF-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*"
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "metadata_unavailable" }), {
          status: 502,
          headers: {
            "content-type": "application/json; charset=UTF-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*"
          }
        });
      }
    }

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>666SOUNDsDESIGn Radio</title>
  <link rel="stylesheet" href="/css/main.css" />
</head>
<body>
  <div id="bootOverlay" class="overlay">
    <div class="boot-panel">
      <div class="boot-title">666SOUNDsDESIGn</div>
      <div class="boot-subtitle">Starting Audio Systems</div>
      <button id="bootButton" class="neon-button">OK</button>
      <div class="progress-wrap"><div id="progressBar" class="progress-bar"></div></div>
      <div id="progressText" class="progress-text">0%</div>
      <div class="boot-note">Tap once to initialize audio on iPhone / iPad.</div>
    </div>
  </div>
  <main class="app-shell">
    <section class="player-card">
      <div class="brand">666SOUNDsDESIGn</div>
      <div class="status-row">
        <span id="streamStatus" class="pill">Ready</span>
        <span id="fallbackStatus" class="pill pill-dim">Primary</span>
      </div>
      <div class="meta-block">
        <div class="meta-label">Now Playing</div>
        <div id="trackTitle" class="track-title">Waiting for stream data...</div>
        <div id="djInfo" class="dj-info">DJ status unavailable</div>
      </div>
      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-label">Listeners</div>
          <div id="listeners" class="stat-value">0</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Source</div>
          <div id="sourceLabel" class="stat-value">Primary</div>
        </div>
      </div>
      <div class="controls">
        <button id="playBtn" class="neon-button">Play</button>
        <button id="pauseBtn" class="neon-button alt">Pause</button>
        <button id="reconnectBtn" class="neon-button alt">Reconnect</button>
      </div>
      <audio id="radio" preload="none" playsinline></audio>
    </section>
  </main>
  <script type="module" src="/js/app.js"></script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=UTF-8" }
    });
  }
};
