/*
 * 666SOUNDsDESIGn central stream/track artwork priority core v2.0.0.
 * Priority: track artwork once for 18 s -> stream/station artwork -> local fallback.
 */
(() => {
  'use strict';
  if (window.SMFPArtworkCore?.version === '2.0.0') return;

  const ENDPOINT = '/api/nowplaying';
  const POLL_MS = 8000;
  const TRACK_MS = 18000;
  const fallback = () => window.VELUNA_ASSETS?.fallbackCover || '/assets/veluna/covers/veluna-stream-fallback.webp';
  const targets = new Set();
  const badUrls = new Set();
  let timer = 0;
  let revertTimer = 0;
  let streamUrl = '';
  let trackUrl = '';
  let desiredUrl = '';
  let mode = 'fallback';
  let lastTrackKey = '';
  let presentedTrackKey = '';
  let latestMetadata = null;
  let trackExpiresAt = 0;
  let enforcing = false;

  const clean = value => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();

  function toUrl(value) {
    if (!value) return '';
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = toUrl(item);
        if (found) return found;
      }
      return '';
    }
    if (typeof value === 'object') {
      return toUrl(value.url || value.src || value.href || value.image || value.cover || value.art || value.artwork || value.large || value.medium || value.thumbnail || value.picture);
    }
    const raw = clean(value);
    if (!raw || /^data:|^blob:/i.test(raw)) return '';
    try {
      const url = new URL(raw, location.origin).toString();
      return badUrls.has(url) ? '' : url;
    } catch (_) {
      return '';
    }
  }

  function first(...values) {
    for (const value of values) {
      const found = toUrl(value);
      if (found) return found;
    }
    return '';
  }

  function streamArtwork(data) {
    return first(
      data?.stream_image,
      data?.streamImage,
      data?.station_image,
      data?.stationImage,
      data?.station_logo,
      data?.stationLogo,
      data?.logo_url,
      data?.logoUrl,
      data?.radio_image,
      data?.radioImage,
      data?.stream?.image,
      data?.stream?.cover,
      data?.stream?.artwork,
      data?.station?.image,
      data?.station?.cover,
      data?.station?.artwork,
      data?.station?.logo,
      data?.radio?.image,
      data?.radio?.cover,
      data?.server?.image,
      data?.server?.cover,
      data?.channel?.image,
      data?.mount?.image,
      data?.branding?.image,
      data?.branding?.cover,
      data?.branding?.logo
    );
  }

  function trackArtwork(data) {
    return first(
      data?.track_image,
      data?.trackImage,
      data?.track_art,
      data?.trackArt,
      data?.track_artwork,
      data?.trackArtwork,
      data?.song_image,
      data?.songImage,
      data?.song_art,
      data?.songArt,
      data?.now_playing?.song?.art,
      data?.now_playing?.song?.artwork,
      data?.now_playing?.song?.image,
      data?.now_playing?.song?.cover,
      data?.now_playing?.cover,
      data?.now_playing?.image,
      data?.current_track?.image,
      data?.current_track?.artwork,
      data?.currentTrack?.image,
      data?.currentTrack?.artwork,
      data?.song?.art,
      data?.song?.artwork,
      data?.song?.image,
      data?.track?.art,
      data?.track?.artwork,
      data?.track?.image,
      data?.cover_url,
      data?.coverUrl,
      data?.album_art,
      data?.albumArt,
      data?.artwork_url,
      data?.artworkUrl
    );
  }

  function titleOf(data) {
    const values = [
      data?.display_title,
      data?.normalized_title,
      data?.title_display,
      data?.now_playing?.song?.text,
      data?.now_playing?.song?.title,
      data?.song?.text,
      data?.song?.title,
      data?.track?.title,
      data?.song,
      data?.title,
      data?.songtitle,
      data?.track,
      data?.currentSong,
      data?.current_song,
      data?.nowplaying,
      data?.nowPlaying
    ];
    for (const value of values) {
      if (typeof value === 'string' || typeof value === 'number') {
        const text = clean(value);
        if (text) return text;
      }
    }
    return '';
  }

  function collectTargets(root = document) {
    root.querySelectorAll?.('#coverImage,#nowCover,img.now-cover,[data-stream-cover],[data-now-playing-cover]').forEach(image => {
      if (!(image instanceof HTMLImageElement)) return;
      if (targets.has(image)) return;
      targets.add(image);
      image.dataset.smfpArtworkManaged = '1';
      image.addEventListener('error', () => {
        const failed = image.currentSrc || image.src;
        if (failed) badUrls.add(failed);
        if (failed === desiredUrl) {
          if (mode === 'track') {
            trackUrl = '';
            revertToStream('track-error');
          } else if (mode === 'stream') {
            streamUrl = '';
            setDesired(fallback(), 'fallback', 'stream-error');
          } else {
            setDesired(fallback(), 'fallback', 'fallback-error');
          }
        }
      });
    });
    targets.forEach(image => { if (!image.isConnected) targets.delete(image); });
  }

  function paint(image, url, nextMode) {
    if (!image || !url) return;
    let current = '';
    try { current = new URL(image.getAttribute('src') || image.src, location.origin).toString(); } catch (_) {}
    if (current === url) {
      image.dataset.smfpArtworkMode = nextMode;
      return;
    }
    image.style.transition = image.style.transition || 'opacity .42s ease';
    image.style.opacity = '.18';
    requestAnimationFrame(() => {
      enforcing = true;
      image.src = url;
      image.dataset.smfpArtworkMode = nextMode;
      image.dataset.trackArtworkActive = nextMode === 'track' ? '1' : '0';
      requestAnimationFrame(() => {
        image.style.opacity = nextMode === 'track' ? '.98' : '.90';
        enforcing = false;
      });
    });
  }

  function enforce() {
    collectTargets();
    const url = desiredUrl || streamUrl || fallback();
    targets.forEach(image => paint(image, url, mode));
    document.documentElement.setAttribute('data-smfp-artwork-mode', mode);
    document.documentElement.setAttribute('data-smfp-artwork-source', url);
  }

  function setDesired(url, nextMode, reason) {
    desiredUrl = toUrl(url) || fallback();
    mode = nextMode || 'fallback';
    document.documentElement.setAttribute('data-smfp-artwork-reason', reason || 'update');
    enforce();
    try {
      window.dispatchEvent(new CustomEvent('smfpartworkchange', { detail:{ url:desiredUrl, mode, reason:reason || 'update', trackMs:TRACK_MS } }));
    } catch (_) {}
  }

  function revertToStream(reason) {
    clearTimeout(revertTimer);
    revertTimer = 0;
    setDesired(streamUrl || fallback(), streamUrl ? 'stream' : 'fallback', reason || 'track-expired');
  }

  function update(data) {
    latestMetadata = data || {};
    const nextStream = streamArtwork(data);
    const nextTrack = trackArtwork(data);
    const title = titleOf(data);
    const key = `${title}::${nextTrack}`;

    streamUrl = nextStream || '';
    trackUrl = nextTrack || '';
    lastTrackKey = key;

    clearTimeout(revertTimer);
    revertTimer = 0;

    if (trackUrl && trackUrl !== streamUrl && key && key !== presentedTrackKey) {
      presentedTrackKey = key;
      trackExpiresAt = Date.now() + TRACK_MS;
      setDesired(trackUrl, 'track', 'new-track-artwork');
      revertTimer = window.setTimeout(() => revertToStream('track-18s-complete'), TRACK_MS);
      return;
    }

    if (mode === 'track' && key === presentedTrackKey) {
      const remaining = trackExpiresAt - Date.now();
      if (remaining > 0) {
        revertTimer = window.setTimeout(() => revertToStream('track-18s-complete'), remaining);
        enforce();
        return;
      }
      revertToStream('track-18s-complete');
      return;
    }

    setDesired(streamUrl || fallback(), streamUrl ? 'stream' : 'fallback', streamUrl ? 'stream-artwork' : 'fallback-only');
  }

  async function poll() {
    try {
      const response = await fetch(`${ENDPOINT}?artwork=${Date.now()}`, { cache:'no-store', credentials:'same-origin', headers:{ accept:'application/json' } });
      if (!response.ok) throw new Error(`metadata_http_${response.status}`);
      update(await response.json());
    } catch (_) {
      if (!desiredUrl) setDesired(fallback(), 'fallback', 'metadata-unavailable');
      else enforce();
    }
  }

  function start() {
    collectTargets();
    if (!desiredUrl) setDesired(fallback(), 'fallback', 'boot');
    void poll();
    clearInterval(timer);
    timer = window.setInterval(poll, POLL_MS);

    const observer = new MutationObserver(records => {
      collectTargets();
      if (enforcing) return;
      for (const record of records) {
        if (record.type === 'attributes' && record.target instanceof HTMLImageElement && record.target.dataset.smfpArtworkManaged === '1') {
          requestAnimationFrame(enforce);
          break;
        }
        if (record.addedNodes?.length) requestAnimationFrame(enforce);
      }
    });
    observer.observe(document.documentElement, { subtree:true, childList:true, attributes:true, attributeFilter:['src'] });
  }

  window.SMFPArtworkCore = Object.freeze({
    version:'2.0.0',
    trackDurationMs:TRACK_MS,
    poll,
    update,
    enforce,
    getState:() => ({ mode, desiredUrl, streamUrl, trackUrl, lastTrackKey, presentedTrackKey, trackExpiresAt, metadata:latestMetadata })
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
  window.addEventListener('pageshow', () => { collectTargets(); enforce(); void poll(); }, { passive:true });
})();
