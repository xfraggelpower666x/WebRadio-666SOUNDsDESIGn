export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,Range,X-Admin-Password",
        "Access-Control-Expose-Headers": "Content-Length,Content-Range,Accept-Ranges,Content-Type",
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
      }

      if (url.pathname === "/" || url.pathname === "/health") {
        return new Response(JSON.stringify({
          ok: true,
          worker: "webradio-666soundsdesign-worker",
          mode: "WORKERS_DEV_RESET",
          endpoint: url.pathname
        }, null, 2), { status: 200, headers });
      }

      if (url.pathname === "/debug") {
        return new Response(JSON.stringify({
          ok: true,
          worker: "webradio-666soundsdesign-worker",
          mode: "WORKERS_DEV_RESET",
          url: request.url,
          method: request.method,
          message: "Minimaler Reset-Worker läuft stabil."
        }, null, 2), { status: 200, headers });
      }

      if (url.pathname === "/metadata") {
        return new Response(JSON.stringify({
          ok: true,
          title: "Radio Online",
          source: "workers.dev reset",
          updatedAt: Date.now()
        }, null, 2), { status: 200, headers });
      }

      if (url.pathname === "/stream") {
        const upstream = await fetch("https://my.idjstream.com/666soundsdesign/stream", {
          method: request.method === "HEAD" ? "HEAD" : "GET",
          headers: {
            "Accept": "audio/mpeg,*/*",
            "Accept-Encoding": "identity",
            ...(request.headers.get("Range") ? { "Range": request.headers.get("Range") } : {})
          }
        });

        const out = new Headers(upstream.headers);
        out.set("Access-Control-Allow-Origin", "*");
        out.set("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
        out.set("Access-Control-Allow-Headers", "Content-Type,Authorization,Range,X-Admin-Password");
        out.set("Access-Control-Expose-Headers", "Content-Length,Content-Range,Accept-Ranges,Content-Type");
        out.set("Cache-Control", "no-store");
        if (!out.get("Content-Type")) out.set("Content-Type", "audio/mpeg");

        ["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade"].forEach((h) => out.delete(h));

        return new Response(request.method === "HEAD" ? null : upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: out
        });
      }

      return new Response(JSON.stringify({
        ok: false,
        error: "not_found",
        path: url.pathname
      }, null, 2), { status: 404, headers });

    } catch (err) {
      return new Response(JSON.stringify({
        ok: false,
        error: "worker_runtime_error",
        message: String(err)
      }, null, 2), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }
  }
};
