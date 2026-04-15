// ACTIVE WORKER
// Player delivery has been switched to external files in:
/// index.html
/// css/main.css
/// js/app.js
/// config/stream.config.js
// Backup of the original embedded-player worker is kept next to this file as:
// worker.ORIGINAL.js
const PRIMARY_STREAM_URL = "https://my.idjstream.com/666soundsdesign/stream";
const FALLBACK_STREAM_URL = "https://my.idjstream.com:8686/stream";
const METADATA_URL = "https://my.idjstream.com/cp/get_info.php?p=8686";

function passthroughHeaders(sourceHeaders){
  const headers=new Headers();
  const allow=["content-type","content-length","accept-ranges","content-range","cache-control","icy-br","icy-description","icy-genre","icy-metaint","icy-name","icy-notice1","icy-notice2","icy-pub","icy-url","transfer-encoding"];
  for(const key of allow){const value=sourceHeaders.get(key);if(value)headers.set(key,value)}
  headers.set("access-control-allow-origin","*");
  headers.set("x-radio-proxy","666soundsdesign-worker");
  return headers;
}
async function proxyStream(request,upstream){
  const init={method:request.method,headers:new Headers()};
  const range=request.headers.get("range");
  const userAgent=request.headers.get("user-agent");
  const accept=request.headers.get("accept");
  const icyMeta=request.headers.get("icy-metadata");
  if(range)init.headers.set("range",range);
  if(userAgent)init.headers.set("user-agent",userAgent);
  if(accept)init.headers.set("accept",accept);
  if(icyMeta)init.headers.set("icy-metadata",icyMeta);
  const response=await fetch(upstream,init);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:passthroughHeaders(response.headers)});
}

export default {
  async fetch(request, env) {
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
        const upstream = await fetch(METADATA_URL, { headers: { "cache-control": "no-store" } });
        const body = await upstream.text();
        return new Response(body, {
          status: upstream.status,
          headers: {
            "content-type": "application/json; charset=UTF-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
            "x-radio-proxy": "666soundsdesign-worker"
          }
        });
      } catch (err) {
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
      } catch (err) {
        return await proxyStream(request, FALLBACK_STREAM_URL);
      }
    }

    if (url.pathname === "/fallback-stream") {
      return await proxyStream(request, FALLBACK_STREAM_URL);
    }

    // External frontend files are served via Cloudflare static assets.
    // If / is routed through the worker, explicitly hand it to the static index.
    if (url.pathname === "/") {
      return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    }

    return env.ASSETS.fetch(request);
  }
};
