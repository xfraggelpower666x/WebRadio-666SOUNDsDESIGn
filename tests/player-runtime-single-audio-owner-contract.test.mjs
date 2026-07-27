import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const publicHtml=fs.readFileSync('public/index.html','utf8');

test('mobile UI delegates transport to canonical player core',()=>{
  assert.match(html,/return q\('#radio'\)\|\|q\('audio'\)\|\|null/);
  assert.match(html,/getElementById\('playBtn'\)/);
  assert.match(html,/getElementById\('pauseBtn'\)/);
  assert.match(html,/getElementById\('stopBtn'\)/);
  assert.doesNotMatch(html,/createElement\(['\"]audio['\"]\)/);
  assert.equal(html,publicHtml);
});
