// ==========================================
// 666SOUNDsDESIGn — MINI ROOT FIX PATCH
// ==========================================
//
// TYPE:        Cloudflare Worker
// PURPOSE:     Fixes broken domain entry "/" without touching
//              stream / metadata / fallback logic.
// SCOPE:       Emergency root redirect only
//
// VERSION:     v1.1
// CREATED:     2026-04-16
// UPDATED:     2026-04-16
//
// NOTES:
// - Root path "/" redirects to the external player
// - Intended for fast Scriptable upload while mobile
//
// ==========================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ===== MINI FIX =====
    if (url.pathname === "/") {
      return Response.redirect("https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/external-player/", 302);
    }

    // ===== FALLBACK =====
    return new Response("Worker OK", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
};
