import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const recovery=fs.readFileSync('js/discord-startup-autopost-recovery.js','utf8');
const recoveryMirror=fs.readFileSync('public/js/discord-startup-autopost-recovery.js','utf8');
const assets=fs.readFileSync('config/veluna-assets.js','utf8');
const assetsMirror=fs.readFileSync('public/config/veluna-assets.js','utf8');
const discord=fs.readFileSync('js/addons/discord-player-addon-v3.js','utf8');

test('Discord startup recovery root/public mirrors stay byte-identical',()=>{
  assert.equal(recovery,recoveryMirror);
  assert.equal(assets,assetsMirror);
});

test('shared all-player bootstrap loads the bounded Discord startup recovery',()=>{
  assert.ok(assets.includes("const discordRecoveryVersion = '2026-08-21-discord-startup-recovery-v1'"));
  assert.ok(assets.includes('/js/discord-startup-autopost-recovery.js?v=${discordRecoveryVersion}'));
  assert.ok(assets.includes("'s666DiscordStartupRecovery'"));
});

test('recovery delegates only to the authoritative Discord addon and never posts directly',()=>{
  assert.ok(recovery.includes("api.postTrackIfChanged(true, 'startup-recovery-missed-playing-race')"));
  assert.ok(recovery.includes("api.transportMode() !== 'worker'"));
  assert.equal(recovery.includes("fetch('/api/discord/nowplaying'"),false);
  assert.equal(recovery.includes('discord.com/api/webhooks'),false);
  assert.equal(recovery.includes('discordapp.com/api/webhooks'),false);
});

test('recovery remains bounded and requires real playback plus usable metadata',()=>{
  assert.ok(recovery.includes('MAX_WAIT_MS = 24000'));
  assert.ok(recovery.includes('audioIsPlaying()'));
  assert.ok(recovery.includes('!audio.paused'));
  assert.ok(recovery.includes('usefulTrack(api)'));
  assert.ok(recovery.includes('loading metadata|metadata loading|metadata unavailable'));
});

test('normal startup success or global dedupe disables the recovery path',()=>{
  assert.ok(recovery.includes("phase === 'startup-autopost-success'"));
  assert.ok(recovery.includes("reason === 'already-posted-by-watcher'"));
  assert.ok(recovery.includes("reason === 'global_duplicate_track'"));
  assert.ok(recovery.includes('result.deduped === true'));
});

test('authoritative Discord addon and global-gate compatible reason stay intact',()=>{
  assert.ok(discord.includes("postJson('/api/discord/nowplaying'"));
  assert.ok(discord.includes("postTrackIfChanged(true, 'startup-first-now-playing')"));
  assert.ok(discord.includes('startupNowPlayingAutopost: true'));
});
