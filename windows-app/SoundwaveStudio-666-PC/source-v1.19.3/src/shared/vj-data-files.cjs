'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const MAX_BYTES = 2 * 1024 * 1024;

async function readSelectedFiles(paths, kind) {
  const extension = kind === 'parity' ? '.json' : kind === 'sync' ? '.csv' : '';
  if (!extension || !Array.isArray(paths) || !paths.length ||
      paths.length > (kind === 'parity' ? 16 : 1)) throw new Error('Invalid VJ data selection');
  const result = [];
  let total = 0;
  for (const file of paths) {
    if (typeof file !== 'string' || !path.isAbsolute(file) ||
        path.extname(file).toLowerCase() !== extension) throw new Error('Invalid VJ data file');
    const stat = await fs.promises.stat(file);
    if (!stat.isFile() || stat.size <= 0 || total + stat.size > MAX_BYTES) throw new Error('VJ data file is empty or too large');
    const chunks = [];
    for await (const chunk of fs.createReadStream(file)) {
      total += chunk.length;
      if (total > MAX_BYTES) throw new Error('VJ data files exceed size limit');
      chunks.push(chunk);
    }
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)); }
    catch { throw new Error('VJ data must be valid UTF-8'); }
    result.push({ name: path.basename(file), text });
  }
  return result;
}

module.exports = { readSelectedFiles };
