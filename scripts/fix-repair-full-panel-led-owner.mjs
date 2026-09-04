import { readFile, writeFile } from 'node:fs/promises';
const path = 'scripts/repair-full-panel-led-owner.mjs';
let text = await readFile(path, 'utf8');
const from = "\\\\${id}";
const to = "\\${id}";
if (!text.includes(from)) throw new Error('expected escaped id marker not found');
text = text.replace(from, to);
await writeFile(path, text);
console.log('repair script escaping fixed');
