/*
  666SOUNDsDESIGn — CUSTOM PLAYER HEADER LIVEHUD V1
  TASK 8: Binds the new user header artwork to existing player functions.
  - Mirrors live title / metadata / bitrate / main-backup / time / volume.
  - Adds hotspot controls that proxy into existing buttons.
  - Animates mini meters from --pc-audio-energy (already driven by equalizer.js).
  No worker changes.
*/
(function(){
  'use strict';
  var VERSION='custom-player-header-livehud-v1-20260605';
  var frameCount=0;
  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(n, min, max){ n=Number(n); if(!isFinite(n)) n=min; return Math.max(min, Math.min(max, n)); }
  function clean(s){ return String(s || '').replace(/\s+/g,' ').trim(); }
  function shorten(s, max){ s=clean(s); if(!s) return ''; return s.length>max ? s.slice(0,max-1).trim()+'…' : s; }
  function setText(id, value){ var el=qs('#'+id); if(el) el.textContent = value; }
  function readText(sel){ var el=qs(sel); return clean(el && el.textContent); }
  function click(sel){ var el=qs(sel); if(!el) return false; try{ el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})); return true; }catch(err){ try{ el.click(); return true; }catch(_){ return false; } } }
  function input(el){ if(!el) return; try{ el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }catch(err){} }
  function transportState(){
    var state = clean(document.body.getAttribute('data-transport-state') || document.body.getAttribute('data-player-state') || document.documentElement.getAttribute('data-transport-state') || '').toLowerCase();
    if(/play/.test(state)) return 'play';
    if(/pause/.test(state)) return 'pause';
    if(/stop/.test(state)) return 'stop';
    var audio = qs('#radio');
    if(audio && !audio.paused) return 'play';
    return 'stop';
  }
  function backupActive(){
    var fb=qs('#fallbackBtn');
    var mb=qs('#mainBtn');
    if(fb && (fb.classList.contains('is-active') || fb.getAttribute('aria-pressed')==='true')) return true;
    if(mb && (mb.classList.contains('is-active') || mb.getAttribute('aria-pressed')==='true')) return false;
    var fallbackCode = readText('#fallbackBtn .status-code,#fallbackBtn');
    if(/BACK|B/i.test(fallbackCode) && fb && /state-backup/.test(fb.className)) return true;
    return /back|backup|fallback/i.test(clean(document.body.getAttribute('data-source') || document.body.getAttribute('data-stream-source') || ''));
  }
  function openSound(){
    if(window.S666SoundControl && typeof window.S666SoundControl.open === 'function'){ window.S666SoundControl.open(); return true; }
    return click('#eqBars');
  }
  function togglePlayPause(){
    var state=transportState();
    return state==='play' ? click('#pauseBtn') : click('#playBtn');
  }
  function adjustVolume(delta){
    var slider=qs('#volumeSlider');
    if(!slider) return false;
    var next=clamp(Number(slider.value || 0.75) + delta, 0, 1);
    slider.value=String(next.toFixed(2));
    input(slider);
    return true;
  }
  function ensureBars(sel, count){
    var host=qs(sel); if(!host || host.children.length) return;
    for(var i=0;i<count;i++){ var bar=document.createElement('i'); bar.style.setProperty('--bar-level', String(0.1 + (i%4)*0.08)); host.appendChild(bar); }
  }
  function bindActions(){
    qsa('[data-header-action]').forEach(function(btn){
      if(btn.dataset.headerBound==='1') return;
      btn.dataset.headerBound='1';
      btn.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        var action = btn.getAttribute('data-header-action');
        if(action==='eq') openSound();
        else if(action==='history') click('#historyToggle');
        else if(action==='main') click('#mainBtn');
        else if(action==='transport') togglePlayPause();
        else if(action==='reconnect') click('#reconnectBtn');
        else if(action==='backup') click('#fallbackBtn');
        else if(action==='volume-down') adjustVolume(-0.05);
        else if(action==='volume-up') adjustVolume(0.05);
      }, true);
    });
  }
  function syncText(){
    var title = readText('#metaLine') || readText('#nowPlayingTicker') || '666SOUNDsDESIGn Live Stream';
    var dj = readText('#djText') || '666SOUNDsDESIGn DJ';
    var listeners = readText('#listenersText');
    var bitrate = readText('#bitrateText') || 'Unknown';
    var state = readText('#streamState') || (transportState()==='play' ? 'LIVE' : 'READY');
    var current = readText('#currentTimeText') || '0:00';
    var duration = readText('#durationText') || 'LIVE';
    setText('pcHeaderHudTitle', shorten(title, 44));
    setText('pcHeaderHudMeta', shorten(dj + (listeners ? ' · ' + listeners : ''), 52));
    setText('pcHeaderHudBitrate', shorten(bitrate, 12));
    setText('pcHeaderHudDj', shorten(dj, 14));
    setText('pcHeaderHudSource', backupActive() ? 'BACKUP' : 'MAIN');
    setText('pcHeaderHudState', /error/i.test(state) ? 'STREAM ERROR' : (/live|playing/i.test(state) ? 'LIVE STREAM' : state.toUpperCase()));
    setText('pcHeaderHudCurrent', current);
    setText('pcHeaderHudDuration', duration);

    var progress = qs('#timelineProgress');
    var fill = qs('#pcHeaderHudProgressFill');
    if(progress && fill){
      var width = progress.style.width || '';
      if(/%$/.test(width)) fill.style.width = width;
    }

    var slider = qs('#volumeSlider');
    if(slider){
      var vol = clamp(Math.round(Number(slider.value || 0.75) * 100), 0, 100);
      setText('pcHeaderHudVolumeValue', vol + '%');
      var vfill = qs('#pcHeaderHudVolumeFill');
      if(vfill) vfill.style.width = vol + '%';
    }
  }
  function animateMeters(){
    frameCount += 1;
    var energy = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pc-audio-energy')) || 0.08;
    qsa('#pcHeaderHudMeter i').forEach(function(bar, index){
      var wave = (Math.sin((frameCount * 0.11) + index * 0.6) + 1) / 2;
      var pulse = (Math.sin((frameCount * 0.042) + index * 0.2) + 1) / 2;
      var level = clamp(0.10 + wave * (0.24 + energy * 0.7) + pulse * energy * 0.25, 0.08, 1);
      bar.style.setProperty('--bar-level', level.toFixed(3));
    });
    qsa('#pcHeaderHudSideMeter i').forEach(function(bar, index){
      var wave = (Math.sin((frameCount * 0.08) + index * 1.7) + 1) / 2;
      var level = clamp(0.12 + wave * (0.28 + energy * 0.7), 0.1, 1);
      bar.style.setProperty('--bar-level', level.toFixed(3));
    });
    requestAnimationFrame(animateMeters);
  }
  function init(){
    if(!qs('#pcHeaderBrandSplit[data-custom-header-hud="1"]')) return;
    ensureBars('#pcHeaderHudMeter', 28);
    ensureBars('#pcHeaderHudSideMeter', 2);
    bindActions();
    syncText();
    requestAnimationFrame(animateMeters);
    setInterval(syncText, 700);
    window.S666CustomHeaderHud = { version: VERSION, sync: syncText, togglePlayPause: togglePlayPause, openSound: openSound };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
