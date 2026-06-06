/*
==========================================
DATEI: core/audio/boost-core.js
GEÄNDERT: 2026-06-05
ZWECK:
- Zentrale Boost-Stufen mit getrennten Profilen für PC und iPhone/Mobile.
- PC: maximal kleiner Safe-Boost für große Boxen.
- Mobile/iPhone: volle 0-5 Booststufen für Kopfhörer/Handylautsprecher.
- Keine Secrets, keine Backend-Logik.
==========================================
*/
(function(){
  'use strict';

  var STORAGE_PC = 'smfp_audio_boost_stage_pc_v362';
  var STORAGE_MOBILE = 'smfp_audio_boost_stage_mobile_v362';
  var LEGACY_STORAGE = 'smfp_audio_boost_stage_v177';

  var PROFILES = {
    pc: {
      id: 'pc',
      storageKey: STORAGE_PC,
      label: 'PC SAFE BOOST',
      maxStage: 1,
      stages: [
        { stage:0, gain:1.00, label:'PC FLAT', danger:false },
        { stage:1, gain:1.12, label:'PC MINI', danger:false }
      ]
    },
    mobile: {
      id: 'mobile',
      storageKey: STORAGE_MOBILE,
      label: 'MOBILE BOOST',
      maxStage: 5,
      stages: [
        { stage:0, gain:1.00, label:'BST 0', danger:false },
        { stage:1, gain:1.40, label:'BST 1', danger:false },
        { stage:2, gain:1.70, label:'BST 2', danger:false },
        { stage:3, gain:1.90, label:'BST 3', danger:false },
        { stage:4, gain:2.08, label:'BST 4', danger:true  },
        { stage:5, gain:2.20, label:'BST 5', danger:true  }
      ]
    }
  };

  function isMobileRuntime(){
    try{
      if(document.documentElement && document.documentElement.getAttribute('data-smfp-force-mobile') === '1') return true;
      if(document.body && document.body.getAttribute('data-smfp-active') === '1') return true;
      if(window.matchMedia && window.matchMedia('(max-width: 760px)').matches) return true;
      return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '');
    }catch(e){ return false; }
  }

  function getProfileName(){
    return isMobileRuntime() ? 'mobile' : 'pc';
  }

  function getProfile(profile){
    var name = profile || getProfileName();
    return PROFILES[name] || PROFILES.pc;
  }

  function maxStage(profile){
    return getProfile(profile).maxStage;
  }

  function clampStage(value, profile){
    var p = getProfile(profile);
    var n = Number(value);
    if(!isFinite(n)) n = 0;
    return Math.max(0, Math.min(p.maxStage, Math.round(n)));
  }

  function getStageInfo(value, profile){
    var p = getProfile(profile);
    var s = clampStage(value, p.id);
    return p.stages[s] || p.stages[0];
  }

  function getGain(value, profile){ return getStageInfo(value, profile).gain; }
  function getLabel(value, profile){ return getStageInfo(value, profile).label; }
  function isDanger(value, profile){ return !!getStageInfo(value, profile).danger; }

  function loadStage(profile){
    var p = getProfile(profile);
    try{
      var raw = localStorage.getItem(p.storageKey);
      if(raw === null && p.id === 'mobile') raw = localStorage.getItem(LEGACY_STORAGE);
      if(raw === null && p.id === 'pc') raw = '0';
      return clampStage(raw, p.id);
    }catch(e){ return 0; }
  }

  function saveStage(value, profile){
    var p = getProfile(profile);
    var s = clampStage(value, p.id);
    try { localStorage.setItem(p.storageKey, String(s)); } catch(e) {}
    return s;
  }

  function publish(stage, gain, source, profile){
    var p = getProfile(profile);
    var s = clampStage(stage, p.id);
    var g = Number(gain || getGain(s, p.id));
    try{
      document.documentElement.setAttribute('data-smfp-boost-profile', p.id);
      document.documentElement.setAttribute('data-smfp-boost-stage', String(s));
      document.documentElement.setAttribute('data-smfp-boost-gain', String(g));
      document.documentElement.setAttribute('data-smfp-boost-max-stage', String(p.maxStage));
      document.documentElement.setAttribute('data-smfp-boost-danger', isDanger(s, p.id) ? '1' : '0');
      document.body && document.body.setAttribute('data-boost-profile', p.id);
      document.body && document.body.setAttribute('data-boost-level', String(s));
      document.body && document.body.setAttribute('data-mobile-boost', String(s));
      document.documentElement.style.setProperty('--boost-level', String(s));
      document.documentElement.style.setProperty('--player-boost-level', String(s));
      document.documentElement.style.setProperty('--player-boost-gain', g.toFixed(2));
      document.documentElement.style.setProperty('--player-boost-max-stage', String(p.maxStage));
      window.__boostLevel = s;
      window.__boostProfile = p.id;
      window.dispatchEvent(new CustomEvent('smfpboostchange', { detail:{ stage:s, gain:g, label:getLabel(s,p.id), danger:isDanger(s,p.id), profile:p.id, maxStage:p.maxStage, source:source||'core' } }));
      window.dispatchEvent(new CustomEvent('playerboostchange', { detail:{ level:s, stage:s, gain:g, label:getLabel(s,p.id), danger:isDanger(s,p.id), profile:p.id, maxStage:p.maxStage, source:source||'core' } }));
    }catch(e){}
    return s;
  }

  function syncProfile(){
    var p = getProfile();
    var s = loadStage(p.id);
    return publish(s, getGain(s,p.id), 'profile-sync', p.id);
  }

  window.SMFPBoostCore = {
    version: 'v36.2-split-booster-pc-mobile',
    profiles: JSON.parse(JSON.stringify(PROFILES)),
    stages: PROFILES.mobile.stages.slice(),
    getProfileName: getProfileName,
    getProfile: getProfile,
    maxStage: maxStage,
    clampStage: clampStage,
    getStageInfo: getStageInfo,
    getGain: getGain,
    getLabel: getLabel,
    isDanger: isDanger,
    loadStage: loadStage,
    saveStage: saveStage,
    publish: publish,
    syncProfile: syncProfile
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncProfile, {once:true});
  else syncProfile();
  window.addEventListener('resize', function(){ setTimeout(syncProfile, 120); }, {passive:true});
  window.addEventListener('orientationchange', function(){ setTimeout(syncProfile, 180); }, {passive:true});
})();
