// ==========================================
// 666SOUNDsDESIGn — FINAL FIX ZIP
// ==========================================
//
// TYPE:        Cloudflare Worker mini patch
// PURPOSE:     Fix broken "/" root handling only
// SCOPE:       Redirect root path to the correct GitHub Pages player URL
//
// VERSION:     v1.2
// CREATED:     2026-04-16
// UPDATED:     2026-04-16
//
// IMPORTANT:
// - This is the corrected target URL
// - No GitHub custom domain needed
// - No DNS changes needed
//
// ==========================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ===== FINAL ROOT FIX =====
    if (url.pathname === "/") {
      return Response.redirect("https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/", 302);
    }

    // ===== BASIC HEALTH CHECK =====
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        ok: true,
        mode: "final-fix-zip",
        target: "https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/"
      }, null, 2), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    // ===== SAFE FALLBACK =====
    return new Response("Worker OK", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
};
