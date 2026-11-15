'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg']);
const LIMITS = Object.freeze({ entries: 20000, directories: 1000, depth: 16, pool: 2000, playlists: 100, tracks: 500, ratings: 20000 });

function createAudioLibrary({ userData, filesystem = fs, onChange = () => {} }) {
  const store = path.join(userData, 'radio-wave-audio-library.json');
  let folder = '';
  let playlists = [];
  let ratings = Object.create(null);
  let pool = [];
  let scanErrors = [];
  let storeError = '';
  let scanning = false;
  let generation = 0;
  let pending = null;
  const key = value => process.platform === 'win32' ? value.toLowerCase() : value;
  const trackId = value => crypto.createHash('sha256').update(key(value)).digest('hex');
  const validPath = value => typeof value === 'string' && value.length <= 32768 && path.isAbsolute(value) && EXTENSIONS.has(path.extname(value).toLowerCase());
  const resolvedFile = value => {
    try {
      if (!validPath(value)) return '';
      const stat = filesystem.lstatSync(value);
      if (!stat.isFile() || stat.isSymbolicLink()) return '';
      const resolved = filesystem.realpathSync(value);
      return validPath(resolved) ? resolved : '';
    } catch { return ''; }
  };
  const available = value => {
    const resolved = resolvedFile(value);
    return !!resolved && key(resolved) === key(path.resolve(value));
  };
  const report = error => String(error?.message || error).slice(0, 300);
  const playlist = id => {
    const item = playlists.find(entry => entry.id === id);
    if (!item) throw new Error('Playlist not found.');
    return item;
  };
  const nameValue = value => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) throw new Error('Enter a playlist name (1–100 characters).');
    const name = value.trim();
    if (playlists.some(p => p.name.toLowerCase() === name.toLowerCase())) throw new Error('A playlist with that name already exists.');
    return name;
  };
  function persist(nextFolder, nextPlaylists, nextRatings = ratings) {
    const temp = store + '.new';
    try {
      const contents = JSON.stringify({ version: 1, folder: nextFolder, playlists: nextPlaylists, ratings: nextRatings }, null, 2);
      if (Buffer.byteLength(contents, 'utf8') > 5 * 1024 * 1024) throw new Error('Audio library size limit reached.');
      filesystem.writeFileSync(temp, contents, 'utf8');
      filesystem.renameSync(temp, store);
      storeError = '';
    } catch (error) {
      try { filesystem.unlinkSync(temp); } catch {}
      throw new Error('Could not save audio library: ' + report(error));
    }
    folder = nextFolder;
    playlists = nextPlaylists;
    ratings = nextRatings;
  }
  try {
    if (filesystem.statSync(store).size > 5 * 1024 * 1024) throw new Error('Audio library file is too large.');
    const text = filesystem.readFileSync(store, 'utf8');
    const data = JSON.parse(text);
    if (data.version !== 1 || !Array.isArray(data.playlists) || typeof data.folder !== 'string' ||
        (data.folder && (!path.isAbsolute(data.folder) || data.folder.length > 32768)) ||
        data.playlists.length > LIMITS.playlists) throw new Error('Invalid audio library file.');
    const ids = new Set();
    playlists = data.playlists.map(p => {
      if (!p || typeof p.id !== 'string' || !/^[a-f0-9-]{36}$/.test(p.id) || ids.has(p.id) ||
          typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100 ||
          !Array.isArray(p.tracks) || p.tracks.length > LIMITS.tracks || !p.tracks.every(validPath)) throw new Error('Invalid playlist data.');
      ids.add(p.id);
      return { id: p.id, name: p.name, tracks: p.tracks };
    });
    folder = data.folder;
    if (data.ratings !== undefined) {
      if (!data.ratings || typeof data.ratings !== 'object' || Array.isArray(data.ratings) ||
          Object.keys(data.ratings).length > LIMITS.ratings) {
        storeError = 'Could not load audio ratings: invalid ratings data.';
      } else {
        for (const [id, rating] of Object.entries(data.ratings)) {
          if (/^[a-f0-9]{64}$/.test(id) && Number.isInteger(rating) && rating >= 1 && rating <= 5) ratings[id] = rating;
          else storeError = 'Could not load some audio ratings: invalid ratings data.';
        }
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') { playlists = []; folder = ''; storeError = 'Could not load audio library: ' + report(error); }
  }
  function state() {
    const availability = new Map();
    return {
      folder, scanning, errors: [storeError, ...scanErrors].filter(Boolean),
      pool: pool.map(item => ({ id: item.id, name: item.name, rating: ratings[item.id] ?? null })),
      playlists: playlists.map(p => ({
        id: p.id, name: p.name,
        tracks: p.tracks.map(file => {
          if (!availability.has(file)) availability.set(file, available(file));
          const id = trackId(file);
          return { id, name: path.basename(file), available: availability.get(file), rating: ratings[id] ?? null };
        })
      }))
    };
  }
  function notify() { try { onChange(state()); } catch (error) { console.error('Audio library update failed:', error.message || error); } }
  function copyPlaylists() { return playlists.map(p => ({ ...p, tracks: [...p.tracks] })); }
  function addFiles(id, paths) {
    const next = copyPlaylists();
    const target = next.find(p => p.id === id);
    if (!target) throw new Error('Playlist not found.');
    const seen = new Set(target.tracks.map(key));
    let skipped = 0;
    for (const file of paths) {
      const resolved = resolvedFile(file);
      if (!resolved) { skipped++; continue; }
      if (seen.has(key(resolved))) continue;
      if (target.tracks.length >= LIMITS.tracks) { skipped++; continue; }
      target.tracks.push(resolved); seen.add(key(resolved));
    }
    persist(folder, next);
    return { state: state(), skipped };
  }
  async function scan() {
    const token = ++generation;
    const root = folder;
    scanning = !!root;
    if (!root) { pool = []; scanErrors = []; notify(); return; }
    notify();
    const found = [];
    const errors = [];
    let entries = 0;
    let directories = 0;
    let limited = false;
    const addError = (where, error) => {
      if (errors.length < 10) errors.push(`${where}: ${report(error)}`);
      else if (errors.length === 10) errors.push('Additional scan errors omitted.');
    };
    try {
      const rootStat = await filesystem.promises.lstat(root);
      if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Selected folder is not a real directory (links are not followed).');
      const realRoot = await filesystem.promises.realpath(root);
      const insideRoot = value => {
        const relative = path.relative(realRoot, value);
        return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
      };
      const stack = [{ dir: root, depth: 0 }];
      while (stack.length && token === generation) {
        if (directories >= LIMITS.directories || entries >= LIMITS.entries || found.length >= LIMITS.pool) { limited = true; break; }
        const { dir, depth } = stack.pop();
        directories++;
        try {
          const dirStat = await filesystem.promises.lstat(dir);
          if (!dirStat.isDirectory() || dirStat.isSymbolicLink()) continue;
          const realDir = await filesystem.promises.realpath(dir);
          if (!insideRoot(realDir)) { addError(path.relative(root, dir), 'Folder moved outside the selected root.'); continue; }
          const handle = await filesystem.promises.opendir(dir);
          for await (const entry of handle) {
            if (token !== generation) break;
            if (++entries > LIMITS.entries || found.length >= LIMITS.pool) { limited = true; break; }
            if (entry.isSymbolicLink()) continue;
            const file = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              if (depth < LIMITS.depth) stack.push({ dir: file, depth: depth + 1 });
              else limited = true;
            } else if (entry.isFile() && validPath(file)) {
              try {
                const stat = await filesystem.promises.lstat(file);
                if (stat.isFile() && !stat.isSymbolicLink()) {
                  const realFile = await filesystem.promises.realpath(file);
                  if (insideRoot(realFile)) found.push({ id: trackId(realFile), path: realFile, name: path.relative(root, file) });
                  else addError(path.relative(root, file), 'File moved outside the selected root.');
                }
              } catch (error) { addError(path.relative(root, file), error); }
            }
          }
        } catch (error) { addError(path.relative(root, dir) || 'Selected folder', error); }
      }
    } catch (error) { addError('Selected folder', error); }
    if (token !== generation) return;
    if (limited) errors.push('Scan limit reached; some files may be omitted.');
    found.sort((a, b) => a.name.localeCompare(b.name));
    pool = found;
    scanErrors = errors;
    scanning = false;
    notify();
  }
  function refresh() {
    if (pending) return pending;
    const task = scan();
    pending = task.finally(() => { if (pending === wrapped) pending = null; });
    const wrapped = pending;
    return wrapped;
  }
  return {
    state,
    refresh,
    async selectFolder(selected) {
      if (typeof selected !== 'string' || !path.isAbsolute(selected) || selected.length > 32768) throw new Error('Invalid folder.');
      persist(selected, playlists);
      generation++;
      pending = null;
      pool = [];
      scanErrors = [];
      await refresh();
      return state();
    },
    clearFolder() {
      persist('', playlists);
      generation++;
      pending = null;
      pool = [];
      scanErrors = [];
      scanning = false;
      notify();
      return state();
    },
    create(name) {
      if (playlists.length >= LIMITS.playlists) throw new Error('Playlist limit reached.');
      const next = copyPlaylists();
      next.push({ id: crypto.randomUUID(), name: nameValue(name), tracks: [] });
      persist(folder, next);
      return state();
    },
    rename(id, name) {
      const target = playlist(id);
      if (typeof name === 'string' && name.trim() === target.name) return state();
      const nextName = nameValue(name);
      const next = copyPlaylists();
      next.find(p => p.id === id).name = nextName;
      persist(folder, next);
      return state();
    },
    delete(id) {
      playlist(id);
      persist(folder, playlists.filter(p => p.id !== id));
      return state();
    },
    addFiles,
    setRating(id, rating) {
      if (typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id) ||
          !(rating === null || (Number.isInteger(rating) && rating >= 1 && rating <= 5))) throw new Error('Invalid track rating.');
      if (!pool.some(item => item.id === id) && !playlists.some(p => p.tracks.some(file => trackId(file) === id))) throw new Error('Track not found in audio library.');
      const next = Object.assign(Object.create(null), ratings);
      if (rating === null) delete next[id];
      else {
        if (!(id in next) && Object.keys(next).length >= LIMITS.ratings) throw new Error('Audio rating limit reached.');
        next[id] = rating;
      }
      persist(folder, playlists, next);
      notify();
      return state();
    },
    addPool(id, ids) {
      if (!Array.isArray(ids) || ids.length > LIMITS.pool || ids.some(id => typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id))) throw new Error('Invalid track selection.');
      const selected = new Set(ids);
      const matches = pool.filter(p => selected.has(p.id));
      const safe = matches.filter(p => available(p.path));
      const result = addFiles(id, safe.map(p => p.path));
      result.skipped += selected.size - safe.length;
      return result;
    },
    removeTrack(id, track) {
      const next = copyPlaylists();
      const target = next.find(p => p.id === id);
      if (!target) throw new Error('Playlist not found.');
      target.tracks = target.tracks.filter(file => trackId(file) !== track);
      persist(folder, next);
      return state();
    },
    playlistPaths(id) {
      const tracks = playlist(id).tracks;
      const paths = tracks.filter(available);
      return { paths, missing: tracks.length - paths.length };
    }
  };
}

module.exports = { createAudioLibrary, LIMITS };
