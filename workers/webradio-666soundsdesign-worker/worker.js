export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/stream") {
      return fetch("https://my.idjstream.com/666soundsdesign/stream");
    }

    return new Response(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>666SOUNDsDESIGn Radio</title>
</head>
<body style="background:#111;color:#fff;text-align:center;padding:40px;">
<h1>666SOUNDsDESIGn Radio</h1>
<audio controls autoplay style="width:80%;">
  <source src="/stream" type="audio/mpeg">
</audio>
</body>
</html>`, {
      headers: { "content-type": "text/html" }
    });
  }
};
