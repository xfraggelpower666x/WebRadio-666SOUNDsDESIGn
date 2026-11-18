'use strict';

function youtubeUrl(input) {
  if (typeof input !== 'string' || input.length > 2048) throw new Error('Invalid YouTube link.');
  if (!input.trim()) return 'https://www.youtube.com/';
  const url = new URL(input.trim());
  const short = url.hostname === 'youtu.be';
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      (!short && !['www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname))) {
    throw new Error('Use an HTTPS YouTube video or playlist link.');
  }
  const video = short ? url.pathname.slice(1) :
    url.pathname === '/watch' ? url.searchParams.get('v') :
    /^\/(?:shorts|live)\//.test(url.pathname) ? url.pathname.split('/')[2] : null;
  const playlist = url.searchParams.get('list');
  const target = new URL('https://www.youtube.com/');
  if (video && /^[A-Za-z0-9_-]{11}$/.test(video)) {
    target.pathname = '/watch';
    target.searchParams.set('v', video);
  } else if (url.pathname === '/playlist' && playlist && !short) target.pathname = '/playlist';
  else throw new Error('Use a YouTube video or playlist link.');
  if (playlist && /^[A-Za-z0-9_-]{2,100}$/.test(playlist)) target.searchParams.set('list', playlist);
  if (target.pathname === '/playlist' && !target.searchParams.has('list')) throw new Error('Invalid YouTube playlist.');
  return target.href;
}

module.exports = { youtubeUrl };
