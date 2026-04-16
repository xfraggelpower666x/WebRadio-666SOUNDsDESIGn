// ==========================================
// DOMAIN KEEP FIX
// ==========================================
// PURPOSE:
// Keeps the custom domain visible in the browser by
// proxy-fetching the GitHub Pages HTML instead of redirecting.
//
// TARGET:
// https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/
//
// NOTES:
// - Root "/" is proxied
// - /health stays local
// - Other paths fall back to local "Worker OK"
// ==========================================

const UPSTREAM_URL = "https://xfraggelpower666x.github.io/WebRadio-666SOUNDsDESIGn/";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }

    if (url.pathname === "/") {
      const upstream = await fetch(UPSTREAM_URL, {
        headers: {
          "user-agent": request.headers.get("user-agent") || "Cloudflare-Worker"
        }
      });

      const headers = new Headers(upstream.headers);
      headers.set("cache-control", "no-store");
      headers.delete("content-security-policy");
      headers.delete("x-frame-options");
      headers.delete("content-length");

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers
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
