// 666STREAM: gezielte Regression der bestehenden LYVRA Pegelbruecke (keine simulierten Live-PASS).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const bridge = readFileSync(new URL('../public/js/audio-levels.js', import.meta.url), 'utf8');
const player = readFileSync(new URL('../public/embed/miniplayer.html', import.meta.url), 'utf8');
function fixture() {
  const messages=[], handlers={}; let now=1000;
  const parent={ postMessage:(data, origin)=>messages.push({data,origin}) };
  const audio={paused:false,readyState:4,volume:0.75,muted:false,addEventListener(){}};
  const window={parent,addEventListener:(type,fn)=>handlers[type]=fn};
  const document={hidden:false,getElementById:()=>audio,addEventListener:(type,fn)=>handlers[type]=fn};
  vm.runInNewContext(bridge,{window,document,performance:{now:()=>now},Set,Object,Number,Math});
  return {window,document,parent,audio,messages,handlers,tick:()=>{now+=75},subscribe(origin='https://weblyvra.666soundsdesign-broadcaster.com'){handlers.message({source:parent,origin,data:{type:'lyvra:audio:subscribe',version:1,enabled:true}})}};
}
test('subscribe: nur erlaubte Parent-Origin und v1, initialer Null-Handshake',()=>{
 const x=fixture();x.subscribe('https://attacker.invalid');assert.equal(x.messages.length,0);
 x.handlers.message({source:{},origin:'https://weblyvra.666soundsdesign-broadcaster.com',data:{type:'lyvra:audio:subscribe',version:1,enabled:true}});assert.equal(x.messages.length,0);
 x.subscribe();assert.equal(x.messages.length,1);assert.equal(x.messages[0].data.playing,false);
});
test('echtes laufendes Analyser-Signal sendet endliche 0..1 Baender',()=>{
 const x=fixture();x.subscribe();x.tick();
 x.window.S666AudioLevels.publish(x.audio,{fftSize:128},Uint8Array.from({length:64},()=>100),48000,'running');
 const last=x.messages.at(-1).data;assert.equal(last.playing,true);
 for(const band of ['bass','mid','high','energy'])assert.ok(last[band]>=0&&last[band]<=1);
 assert.ok(last.sequence>x.messages[0].data.sequence);
});
test('suspended AudioContext erzeugt niemals playing:true',()=>{
 const x=fixture();x.subscribe();x.tick();x.window.S666AudioLevels.publish(x.audio,{fftSize:128},Uint8Array.from({length:64},()=>150),48000,'suspended');
 assert.equal(x.messages.at(-1).data.playing,false);assert.equal(x.window.S666AudioLevels.getDiagnostics().lastGenuinePublish,0);
});
test('fehlender Analyser und Stummschaltung erzeugen keine erfundenen Pegel',()=>{
 const x=fixture();x.subscribe();x.tick();x.window.S666AudioLevels.publish(x.audio,null,null,48000,'running');assert.equal(x.messages.at(-1).data.playing,false);
 x.tick();x.audio.muted=true;x.window.S666AudioLevels.publish(x.audio,{fftSize:128},new Uint8Array(64).fill(150),48000,'running');
 assert.equal(x.messages.at(-1).data.playing,false);assert.equal(x.messages.at(-1).data.energy,0);
});
test('Sichtbarkeitstop sendet Nullstatus',()=>{
 const x=fixture();x.subscribe();x.document.hidden=true;x.handlers.visibilitychange();assert.equal(x.messages.at(-1).data.playing,false);
});
test('Player initialisiert Graph vor await play und resümiert bei visibility/pageshow',()=>{
 const playStart=player.indexOf('async function play()'),graph=player.indexOf('enableVisualizer()',playStart),awaitPlay=player.indexOf('await audio.play()',playStart);
 assert.ok(playStart>=0&&graph>playStart&&graph<awaitPlay);
 assert.match(player,/window\.addEventListener\('pageshow'/);
 assert.match(player,/document\.addEventListener\('visibilitychange',[^\n]*enableVisualizer\(\)/);
 assert.match(player,/audioContext\?\.state==='running'/);
});

// Gleiche WebAudio-CORS-Voraussetzung wie Hauptplayer und VELUNA.
test('MiniPlayer nutzt CORS-fähiges einziges Audioelement vor MediaElementSource',()=>{
 const elements=[...player.matchAll(/<audio\b[^>]*\bid="radio"[^>]*>/g)];
 assert.equal(elements.length,1);
 assert.match(elements[0][0],/\bcrossorigin="anonymous"/);
 assert.match(elements[0][0],/\bplaysinline\b/);
 assert.ok(player.indexOf(elements[0][0]) < player.indexOf('window.S666AudioLevels?.publish'));
});

// iPhone diagnostics are observational, local and reuse the existing EQ panel.
test('iOS diagnosis shows real WebAudio and bridge states without another audio player',()=>{
 assert.match(player,/id="miniAudioDiag"/);
 assert.match(player,/audioContext\?\.state\|\|'unavailable'/);
 assert.match(player,/S666AudioLevels\?\.getDiagnostics/);
 assert.match(player,/lastGenuinePublish/);
 assert.match(player,/centralAudioError/);
 assert.match(player,/if\(soundPanel\.hidden\)/);
 assert.equal([...player.matchAll(/<audio\b/g)].length,1);
});

test('MiniPlayer reaktiviert echten Analyser bei AudioContext statechange ohne neue Quelle',()=>{
 assert.match(player,/function onVisualContextStateChange\(\)\{if\(audioContext\?\.state==='running'\)startVisualizer\(\)\}/);
 assert.match(player,/audioContext\.addEventListener\('statechange',onVisualContextStateChange\)/);
 assert.match(player,/visualContextObserved!==audioContext/);
 assert.match(player,/visualContextObserved\?\.removeEventListener\?\.\('statechange',onVisualContextStateChange\)/);
 assert.equal([...player.matchAll(/<audio\b/g)].length,1);
});
