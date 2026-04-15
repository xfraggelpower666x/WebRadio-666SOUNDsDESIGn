const PRIMARY_STREAM_URL = "https://my.idjstream.com/666soundsdesign/stream";
const FALLBACK_STREAM_URL = "https://my.idjstream.com:8686/stream";
const METADATA_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";

async function proxyStream(request, upstream) {
  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  const res = await fetch(upstream, { headers });
  return new Response(res.body, {
    status: res.status,
    headers: {
      "content-type": "audio/mpeg",
      "access-control-allow-origin": "*"
    }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") return new Response("OK");
    if (url.pathname === "/stream") return proxyStream(request, PRIMARY_STREAM_URL);
    if (url.pathname === "/fallback-stream") return proxyStream(request, FALLBACK_STREAM_URL);
    if (url.pathname === "/api/nowplaying") return fetch(METADATA_URL);

    return new Response(HTML, { headers: { "content-type": "text/html" } });
  }
};
