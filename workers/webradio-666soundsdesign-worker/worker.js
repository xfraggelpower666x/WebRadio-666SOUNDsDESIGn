const PRIMARY_STREAM_URL = "https://my.idjstream.com/666soundsdesign/stream";
const FALLBACK_STREAM_URL = "https://my.idjstream.com:8686/stream";
const METADATA_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // HEALTH
    if (url.pathname === "/health") {
      return new Response("OK");
    }

    // METADATA
    if (url.pathname === "/api/nowplaying") {
      const res = await fetch(METADATA_URL);
      return new Response(await res.text(), {
        headers: { "content-type": "application/json" }
      });
    }

    // STREAM PRIMARY
    if (url.pathname === "/stream") {
      return fetch(PRIMARY_STREAM_URL, request);
    }

    // STREAM FALLBACK
    if (url.pathname === "/fallback-stream") {
      return fetch(FALLBACK_STREAM_URL, request);
    }

    // DEFAULT (TEST)
    return new Response("Worker läuft", { status: 200 });
  }
};
