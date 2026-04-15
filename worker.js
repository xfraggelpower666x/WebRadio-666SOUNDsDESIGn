// SAME WORKER IN BOTH LOCATIONS
const PRIMARY_STREAM_URL = "https://my.idjstream.com/666soundsdesign/stream";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/stream") {
      const res = await fetch(PRIMARY_STREAM_URL);
      return new Response(res.body, {
        headers: {
          "content-type": "audio/mpeg",
          "access-control-allow-origin": "*"
        }
      });
    }

    return new Response("Worker OK");
  }
};
