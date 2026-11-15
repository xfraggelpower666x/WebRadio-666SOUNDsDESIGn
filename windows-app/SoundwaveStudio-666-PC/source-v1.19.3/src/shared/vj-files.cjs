'use strict';

const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const { pathToFileURL } = require('url');

function createVjFiles({ fetchFile, fileSystem = fs, makeId = () => randomBytes(16).toString('hex') }) {
  const maxFiles = 100;
  let approved = new Map();
  function replace(paths) {
    if (!Array.isArray(paths) || !paths.length || paths.length > maxFiles) throw new Error('Choose between 1 and 100 videos.');
    const next = new Map();
    const seen = new Set();
    for (const selected of paths) {
      if (typeof selected !== 'string' || selected.length > 32768) throw new Error('Invalid video selection.');
      const file = fileSystem.realpathSync(selected);
      const ext = path.extname(file).toLowerCase();
      if (!['.mp4', '.webm'].includes(ext) || !fileSystem.statSync(file).isFile()) throw new Error('Only local MP4 or WebM files are supported.');
      const key = process.platform === 'win32' ? file.toLowerCase() : file;
      if (seen.has(key)) continue;
      seen.add(key);
      const id = makeId();
      if (!/^[a-f0-9]{32}$/.test(id) || next.has(id)) throw new Error('Could not create a video token.');
      next.set(id, { file, ext, name: path.basename(file) });
    }
    approved = next;
    return [...next].map(([id, entry]) => ({ id, name: entry.name, url: `swvj://video/${id}` }));
  }
  async function handle(request) {
    try {
      const url = new URL(request.url);
      if (!['GET', 'HEAD'].includes(request.method) || url.protocol !== 'swvj:' ||
          url.hostname !== 'video' || url.port || url.username || url.password || url.search || url.hash ||
          !/^\/[a-f0-9]{32}$/.test(url.pathname)) return new Response('Not found', { status: 404 });
      const entry = approved.get(url.pathname.slice(1));
      if (!entry || fileSystem.realpathSync(entry.file) !== entry.file || !fileSystem.statSync(entry.file).isFile()) {
        return new Response('Not found', { status: 404 });
      }
      const headers = new Headers();
      const range = request.headers.get('range');
      if (range) {
        if (range.length > 128 || !/^bytes=\d*-\d*$/.test(range)) return new Response('Invalid range', { status: 416 });
        headers.set('range', range);
      }
      const result = await fetchFile(pathToFileURL(entry.file).href, { method: request.method, headers });
      const responseHeaders = new Headers(result.headers);
      responseHeaders.set('access-control-allow-origin', '*');
      responseHeaders.set('content-type', entry.ext === '.mp4' ? 'video/mp4' : 'video/webm');
      responseHeaders.set('cache-control', 'no-store');
      return new Response(result.body, { status: result.status, statusText: result.statusText, headers: responseHeaders });
    } catch {
      return new Response('Video unavailable', { status: 404 });
    }
  }
  return { replace, clear: () => { approved = new Map(); }, has: id => approved.has(id), handle };
}
module.exports = { createVjFiles };
