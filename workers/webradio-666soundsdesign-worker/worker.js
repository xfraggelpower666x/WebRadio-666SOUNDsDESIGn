export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Range,Content-Type,Accept,Origin",
      "Access-Control-Expose-Headers": "Content-Length,Content-Range,Accept-Ranges",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname === "/" || url.pathname === "/health") return new Response("OK", { headers: cors });

    if (url.pathname === "/stream") {
      const target = env.ORIGINAL_STREAM_URL || "https://my.idjstream.com/8686/stream";
      const range = request.headers.get("Range");
      const upstreamHeaders = { "Accept-Encoding": "identity" };
      if (range) upstreamHeaders["Range"] = range;
      const upstream = await fetch(target, { method: "GET", headers: upstreamHeaders, cf: { cacheTtl: 0, cacheEverything: false } });
      const headers = new Headers(upstream.headers);
      Object.entries(cors).forEach(([k,v]) => headers.set(k,v));
      headers.set("Cache-Control", "no-store");
      if (!headers.get("Content-Type")) headers.set("Content-Type", "audio/mpeg");
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    if (url.pathname === "/status") {
      const infoApi = env.ORIGINAL_META_URL || "https://my.idjstream.com/cp/get_info.php?p=8686";
      try{
        const r = await fetch(infoApi, { headers: { "User-Agent": "666 Repo Root Worker", "Accept": "application/json" }});
        if(!r.ok) throw new Error("HTTP " + r.status);
        const data = await r.json();
        const headers = new Headers(cors);
        headers.set("Content-Type","application/json; charset=utf-8");
        return new Response(JSON.stringify({
          song: data.title ?? null,
          listeners: data.listeners ?? null,
          bitrate: data.bitrate ?? null,
          dj: data.djusername ?? null,
          djstatus: data.djprofile ?? null,
          art: data.art ?? null,
          active_source: "main"
        }, null, 2), { status: 200, headers });
      }catch(err){
        const headers = new Headers(cors);
        headers.set("Content-Type","application/json; charset=utf-8");
        return new Response(JSON.stringify({ error: String(err?.message || err) }, null, 2), { status: 502, headers });
      }
    }

    return new Response("Not found", { status: 404, headers: cors });
  }
};
