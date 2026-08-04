import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Now Playing follows the canonical audio element as well as the mobile helper flag',async()=>{
 const html=await read('index.html');
 assert.equal(await read('public/index.html'),html);
 assert.match(html,/function mffRuntimeIsPlaying\(\)/);
 assert.match(html,/audioPlaying=!!\(a&&hasSource&&!a\.paused&&!a\.ended\)/);
 assert.match(html,/var playing=mffRuntimeIsPlaying\(\);/);
 assert.doesNotMatch(html,/var playing=document\.documentElement\.getAttribute\('data-mff-playing'\)==='1' && !mffUserStopped;/);
});
