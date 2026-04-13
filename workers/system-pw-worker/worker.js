export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, worker: "system-pw" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/config") {
      return new Response(JSON.stringify({
        RADIO_URL: env.RADIO_URL,
        SONGLAB_URL: env.SONGLAB_URL,
        MASTERING_URL: env.MASTERING_URL,
        SOUNDCLOUD_URL: env.SOUNDCLOUD_URL
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
