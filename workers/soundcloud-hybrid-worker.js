
const ALLOWED_HOSTS = [
  "soundcloud.com",
  "m.soundcloud.com",
  "on.soundcloud.com",
  "api.soundcloud.com",
  "w.soundcloud.com",
  "sndcdn.com",
  "cf-media.sndcdn.com",
  "media.soundcloud.com",
];

function corsHeaders(origin = "*") {
  return {
    "access-control-allow-origin": origin || "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  };
}

function json(data, status = 200, origin = "*") {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: corsHeaders(origin),
  });
}

function isAllowedUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return ALLOWED_HOSTS.some(h => u.hostname === h || u.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

async function fetchText(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "666SOUNDsDESIGn-SoundCloud-Hybrid/1.0",
      "accept": "*/*",
      ...headers,
    },
  });
  return {
    ok: res.ok,
    status: res.status,
    text: await res.text(),
    headers: res.headers,
  };
}

function upgradeArtwork(url) {
  if (!url) return "";
  return url
    .replace("-large.", "-t500x500.")
    .replace("large.jpg", "t500x500.jpg")
    .replace("large.png", "t500x500.png");
}

function cleanText(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function parseOEmbed(htmlText, sourceUrl) {
  const titleMatch = htmlText.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || htmlText.match(/<title>([^<]+)<\/title>/i);
  const imageMatch = htmlText.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const descMatch = htmlText.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const userMatch = htmlText.match(/soundcloud:\/\/users:(\d+)/i);

  return {
    ok: true,
    provider: "soundcloud",
    mode: "fallback-html",
    title: cleanText(titleMatch?.[1] || ""),
    artwork: upgradeArtwork(cleanText(imageMatch?.[1] || "")),
    description: cleanText(descMatch?.[1] || ""),
    permalink_url: sourceUrl,
    user: {
      id: userMatch?.[1] || "",
      username: "",
      permalink_url: "",
    },
    trackCount: 0,
    tracks: [],
  };
}

async function resolveViaApi(targetUrl, env) {
  if (!env.SOUNDCLOUD_CLIENT_ID) {
    return null;
  }

  const apiUrl =
    "https://api.soundcloud.com/resolve?url=" +
    encodeURIComponent(targetUrl) +
    "&client_id=" +
    encodeURIComponent(env.SOUNDCLOUD_CLIENT_ID);

  try {
    const res = await fetch(apiUrl, {
      headers: {
        "accept": "application/json",
        "user-agent": "666SOUNDsDESIGn-SoundCloud-Hybrid/1.0",
      },
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data) return null;

    const tracks = Array.isArray(data.tracks)
      ? data.tracks.map((t, i) => ({
          index: i,
          id: t.id || null,
          title: cleanText(t.title || ""),
          duration: t.duration || 0,
          artwork: upgradeArtwork(t.artwork_url || data.artwork_url || data.user?.avatar_url || ""),
          permalink_url: t.permalink_url || "",
        }))
      : [];

    return {
      ok: true,
      provider: "soundcloud",
      mode: "resolve-api",
      kind: data.kind || "",
      id: data.id || null,
      title: cleanText(data.title || ""),
      description: cleanText(data.description || ""),
      artwork: upgradeArtwork(data.artwork_url || data.user?.avatar_url || ""),
      permalink_url: data.permalink_url || targetUrl,
      user: {
        username: cleanText(data.user?.username || ""),
        permalink_url: data.user?.permalink_url || "",
      },
      trackCount: tracks.length,
      tracks,
      raw: data,
    };
  } catch {
    return null;
  }
}

async function resolveViaOEmbed(targetUrl) {
  try {
    const oembedUrl =
      "https://soundcloud.com/oembed?format=json&url=" + encodeURIComponent(targetUrl);
    const res = await fetch(oembedUrl, {
      headers: {
        "accept": "application/json",
        "user-agent": "666SOUNDsDESIGn-SoundCloud-Hybrid/1.0",
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) return null;

    return {
      ok: true,
      provider: "soundcloud",
      mode: "fallback-oembed",
      title: cleanText(data.title || ""),
      description: "",
      artwork: upgradeArtwork(data.thumbnail_url || ""),
      permalink_url: targetUrl,
      user: {
        username: cleanText(data.author_name || ""),
        permalink_url: data.author_url || "",
      },
      trackCount: 0,
      tracks: [],
      raw: data,
    };
  } catch {
    return null;
  }
}

async function resolveViaHtml(targetUrl) {
  try {
    const page = await fetchText(targetUrl, {
      "accept": "text/html,application/xhtml+xml",
    });
    if (!page.ok) return null;
    return parseOEmbed(page.text, targetUrl);
  } catch {
    return null;
  }
}

async function resolveHybrid(targetUrl, env) {
  const api = await resolveViaApi(targetUrl, env);
  if (api) return api;

  const oembed = await resolveViaOEmbed(targetUrl);
  if (oembed) return oembed;

  const html = await resolveViaHtml(targetUrl);
  if (html) return html;

  return {
    ok: false,
    provider: "soundcloud",
    error: "Resolve failed in API and fallback modes.",
    permalink_url: targetUrl,
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "*";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/status") {
      return json({
        ok: true,
        service: "soundcloud-hybrid-worker",
        hasClientId: !!env.SOUNDCLOUD_CLIENT_ID,
        modes: ["resolve-api", "fallback-oembed", "fallback-html"],
      }, 200, origin);
    }

    if (url.pathname === "/resolve") {
      const target = url.searchParams.get("u");
      if (!target) {
        return json({ ok: false, error: "Missing query parameter: u" }, 400, origin);
      }
      if (!isAllowedUrl(target)) {
        return json({ ok: false, error: "Host not allowed" }, 403, origin);
      }

      const result = await resolveHybrid(target, env);
      return json(result, result.ok ? 200 : 500, origin);
    }

    if (url.pathname === "/cors") {
      const target = url.searchParams.get("u");
      if (!target) return json({ ok: false, error: "Missing query parameter: u" }, 400, origin);
      if (!isAllowedUrl(target)) return json({ ok: false, error: "Host not allowed" }, 403, origin);

      const upstream = await fetch(target, {
        headers: {
          "user-agent": "666SOUNDsDESIGn-SoundCloud-Hybrid/1.0",
          "accept": "*/*",
        },
      });
      const headers = new Headers(upstream.headers);
      headers.set("access-control-allow-origin", origin || "*");
      headers.set("cache-control", "no-store");

      return new Response(upstream.body, {
        status: upstream.status,
        headers,
      });
    }

    return json({ ok: false, error: "Not found" }, 404, origin);
  },
};
