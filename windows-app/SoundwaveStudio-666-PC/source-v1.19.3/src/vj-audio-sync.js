(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RWVjAudioSync = factory();
})(globalThis, function () {
  'use strict';

  const MAX_ROWS = 20000;

  function parseRows(text) {
    const rows = [];
    let row = [], field = '', quoted = false, closedQuote = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (char === '"') { quoted = false; closedQuote = true; }
        else field += char;
      } else if (char === '"') {
        if (field || closedQuote) throw new Error('Invalid quoted CSV field');
        quoted = true;
      } else if (char === ',' || char === '\n' || char === '\r') {
        row.push(field); field = ''; closedQuote = false;
        if (char !== ',') {
          if (char === '\r' && text[i + 1] === '\n') i++;
          if (row.some(value => value.trim())) rows.push(row);
          row = [];
          if (rows.length > MAX_ROWS + 1) throw new Error('Audio sync CSV exceeds row limit');
        }
      } else {
        if (closedQuote) throw new Error('Unexpected text after quoted CSV field');
        field += char;
      }
    }
    if (quoted) throw new Error('Unclosed quoted CSV field');
    if (field || row.length) {
      row.push(field);
      if (row.some(value => value.trim())) rows.push(row);
    }
    if (rows.length > MAX_ROWS + 1) throw new Error('Audio sync CSV exceeds row limit');
    return rows;
  }

  function roundMilliseconds(value) {
    const lower = Math.floor(value), fraction = value - lower;
    return fraction === 0.5 ? lower + (lower % 2) : Math.round(value);
  }

  function parse(text) {
    if (typeof text !== 'string' || text.length > 2 * 1024 * 1024) throw new Error('Audio sync CSV is missing or too large');
    const rows = parseRows(text.replace(/^\uFEFF/, ''));
    if (rows.length < 2) throw new Error('Audio sync CSV contains no samples');
    const header = rows[0].map(value => value.trim());
    const timeColumn = header.indexOf('Time_ms'), amplitudeColumn = header.indexOf('Bass_Amplitude');
    if (timeColumn < 0 || amplitudeColumn < 0 ||
        header.lastIndexOf('Time_ms') !== timeColumn || header.lastIndexOf('Bass_Amplitude') !== amplitudeColumn) {
      throw new Error('Audio sync CSV requires Time_ms and Bass_Amplitude columns');
    }
    const samples = new Map();
    for (const row of rows.slice(1)) {
      if (row.length !== header.length || !row[timeColumn].trim() || !row[amplitudeColumn].trim()) {
        throw new Error('Invalid audio sync CSV row');
      }
      const rawTime = Number(row[timeColumn]), amplitude = Number(row[amplitudeColumn]);
      if (!Number.isFinite(rawTime) || rawTime < 0 || rawTime > 604800000 ||
          !Number.isFinite(amplitude) || amplitude < 0) throw new Error('Invalid audio sync sample');
      const timeMs = roundMilliseconds(rawTime);
      samples.set(timeMs, Math.max(samples.get(timeMs) ?? 0, amplitude));
    }
    return [...samples].sort((a, b) => a[0] - b[0]).map(([timeMs, amplitude]) => ({ timeMs, amplitude }));
  }

  function sample(points, previousMs, currentMs) {
    if (!Array.isArray(points) || !points.length || !Number.isFinite(currentMs) || currentMs < 0) return 0;
    let lo = 0, hi = points.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (points[mid].timeMs <= currentMs) lo = mid + 1;
      else hi = mid;
    }
    if (!lo) return 0;
    let result = points[lo - 1].amplitude;
    if (Number.isFinite(previousMs) && previousMs >= 0 && previousMs <= currentMs) {
      for (let i = lo - 2; i >= 0 && points[i].timeMs > previousMs; i--) result = Math.max(result, points[i].amplitude);
    }
    return result;
  }

  return { parse, sample };
});
