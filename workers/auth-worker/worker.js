export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, worker: "auth" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/auth") {
      const pass = req.headers.get("x-admin-password");

      if (pass !== env.ADMIN_PASSWORD) {
        return new Response("Unauthorized", { status: 401 });
      }

      return new Response(JSON.stringify({ ok: true, auth: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
