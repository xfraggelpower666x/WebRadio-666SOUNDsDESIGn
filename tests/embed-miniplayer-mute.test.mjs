// Native 666STREAM MiniPlayer: Mute-Vertrag plattformuebergreifend, ohne zweiten Audio-Graph.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const player = readFileSync(new URL('../public/embed/miniplayer.html', import.meta.url), 'utf8');
const shared = readFileSync(new URL('../public/js/all-player-mute.js', import.meta.url), 'utf8');
test('MiniPlayer besitzt immer eine bedienbare, barrierearme Mute-Taste', () => {
  assert.match(player, /id="miniMuteBtn"[^>]*type="button"[^>]*aria-label="Ton ausschalten"[^>]*aria-pressed="false"/);
  assert.match(player, /\.mini-mute\{[^}]*min-height:44px/);
  assert.match(player, /touch-action:manipulation/);
  assert.match(player, /\.mini-mute:focus-visible/);
  assert.doesNotMatch(player, /@media[^\{]*\{[^}]*\.mini-mute\s*\{\s*display\s*:\s*none/);
});
test('Mute schaltet nur die vorhandene Audioinstanz um, ohne Volume-Reset oder zweiten Player', () => {
  assert.match(player, /muteButton\.addEventListener\('click',\(\)=>\{audio\.muted=!audio\.muted;syncMuteButton\(\)\}\)/);
  assert.match(player, /audio\.addEventListener\('volumechange',syncMuteButton\)/);
  assert.match(player, /muteButton\.setAttribute\('aria-pressed',String\(muted\)\)/);
  assert.match(player, /muted\?'Ton einschalten':'Ton ausschalten'/);
  assert.match(player, /muted\?'🔇':'🔊'/);
  assert.match(shared, /audio\.muted = !audio\.muted/);
  assert.equal((player.match(/<audio\s+id="radio"/g)||[]).length,1);
  assert.doesNotMatch(player, /createMediaElementSource\(audio\)/);
});
test('Bestehende Lautstaerke, Pegel und iOS-Kontextlogik bleiben erhalten', () => {
  assert.match(player, /volume\.addEventListener\('input',\(\)=>audio\.volume=Number\(volume\.value\)\/100\)/);
  assert.match(player, /window\.S666AudioLevels\?\.publish/);
  assert.match(player, /audioContext\?\.state==='running'/);
  assert.match(player, /if\(sourceIndex===0\)enableVisualizer\(\)/);
  assert.match(player, /core\.applyBoost\(audio,/);
  assert.match(player, /core\.applyEq\(audio,/);
});
