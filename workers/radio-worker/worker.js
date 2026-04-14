export default {
  async fetch(request) {
    const url = new URL(request.url);

    const PRIMARY = "https://my.idjstream.com/666soundsdesign/stream";
    const FALLBACK = "https://my.idjstream.com:8686/stream";

    if (url.pathname === "/stream") {
      try {
        let res = await fetch(PRIMARY, { method: "HEAD" });
        if (res.ok) return fetch(PRIMARY);
        return fetch(FALLBACK);
      } catch(e) {
        return fetch(FALLBACK);
      }
    }

    if (url.pathname === "/health") {
      return new Response("OK");
    }

    return fetch(request);
  }
}
