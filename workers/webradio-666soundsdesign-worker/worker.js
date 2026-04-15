const PRIMARY_STREAM_URL = "https://my.idjstream.com/666soundsdesign/stream";
const FALLBACK_STREAM_URL = "https://my.idjstream.com:8686/stream";
const METADATA_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";

async function proxyStream(request, upstream) {
  const headers = new Headers();

  const range = request.headers.get("range");
  const accept = request.headers.get("accept");
  const icyMeta = request.headers.get("icy-metadata");
  const userAgent = request.headers.get("user-agent");

  if (range) headers.set("range", range);
  if (accept) headers.set("accept", accept);
  if (icyMeta) headers.set("icy-metadata", icyMeta);
  if (userAgent) headers.set("user-agent", userAgent);

  const res = await fetch(upstream, {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers
  });

  const out = new Headers(res.headers);
  out.set("access-control-allow-origin", "*");
  out.set("cache-control", "no-store");

  return new Response(request.method === "HEAD" ? null : res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: out
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("OK", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=UTF-8",
          "cache-control": "no-store",
          "access-control-allow-origin": "*"
        }
      });
    }

    if (url.pathname === "/api/nowplaying") {
      try {
        const res = await fetch(METADATA_URL, {
          headers: { "cache-control": "no-store" }
        });

        return new Response(await res.text(), {
          status: res.status,
          headers: {
            "content-type": "application/json; charset=UTF-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*"
          }
        });
      } catch {
        return new Response(JSON.stringify({ error: "metadata_proxy_failed" }), {
          status: 502,
          headers: {
            "content-type": "application/json; charset=UTF-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*"
          }
        });
      }
    }

    if (url.pathname === "/stream") {
      try {
        return await proxyStream(request, PRIMARY_STREAM_URL);
      } catch {
        return await proxyStream(request, FALLBACK_STREAM_URL);
      }
    }

    if (url.pathname === "/fallback-stream") {
      return await proxyStream(request, FALLBACK_STREAM_URL);
    }

    return new Response("Worker OK", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=UTF-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*"
      }
    });
  }
};
