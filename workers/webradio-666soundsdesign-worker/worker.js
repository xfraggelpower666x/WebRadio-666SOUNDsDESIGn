export default {
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ok:true}), {headers:{"content-type":"application/json"}});
    }

    if (url.pathname === "/metadata") {
      return new Response(JSON.stringify({ok:true,title:"Radio Online"}), {headers:{"content-type":"application/json"}});
    }

    if (url.pathname === "/stream") {
      return fetch("https://my.idjstream.com/666soundsdesign/stream");
    }

    return new Response("OK");
  }
};
