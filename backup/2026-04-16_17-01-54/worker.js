// ==========================================
// 666SOUNDsDESIGn — PLAYER FIX ZIP
// ==========================================
//
// TYPE:        Cloudflare Worker mini patch
// PURPOSE:     Redirect root "/" to the external player HTML page
// SCOPE:       Minimal root fix only
//
// VERSION:     v1.0
// CREATED:     2026-04-16
// UPDATED:     2026-04-16
//
// IMPORTANT:
// - Redirect target is the external player HTML page
// - No DNS changes needed
// - No GitHub custom domain needed
//
// ==========================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ===== PLAYER FIX =====
    if (url.pathname === "/") {
      return Response.redirect("https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/external-player/index.html", 302);
    }

    // ===== HEALTH =====
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        ok: true,
        mode: "player-fix-zip",
        target: "https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/external-player/index.html"
      }, null, 2), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    return new Response("Worker OK", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
};
