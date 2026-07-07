/*
==========================================
DATEI: core/audio/boost-core.js
ERSTELLT: 2026-05-18
GEÄNDERT: 2026-05-18
ZWECK:
- Zentrale Boost-Stufen für PC und iPhone.
- Eine Quelle für Stage, Gain, Clamp, Label und Persistenz.
- Verhindert alte Hotfix-Clamps in PC/iPhone Einzelcode.
- Keine Secrets, keine Backend-Logik.
==========================================
*/
(function(){
  'use strict';
  var STORAGE_KEY = 'smfp_audio_boost_stage_v177';
  var STAGES = [
    { stage:0, gain:1.00, label:'BST 0', danger:false },
    { stage:1, gain:1.26, label:'BST 1', danger:false },
    { stage:2, gain:1.78, label:'BST 2', danger:false },
    { stage:3, gain:2.24, label:'BST 3', danger:false },
    { stage:4, gain:2.82, label:'BST 4', danger:true  },
    { stage:5, gain:3.98, label:'BST 5', danger:true  }
  ];
  function maxStage(){ return STAGES.length - 1; }
  function clampStage(value){
    var n = Number(value);
    if(!isFinite(n)) n = 0;
    return Math.max(0, Math.min(maxStage(), Math.round(n)));
  }
  function getStageInfo(value){
    var s = clampStage(value);
    return STAGES[s] || STAGES[0];
  }
  function getGain(value){ return getStageInfo(value).gain; }
  function getLabel(value){ return getStageInfo(value).label; }
  function isDanger(value){ return !!getStageInfo(value).danger; }
  function loadStage(){
    try { return clampStage(localStorage.getItem(STORAGE_KEY)); } catch(e) { return 0; }
  }
  function saveStage(value){
    var s = clampStage(value);
    try { localStorage.setItem(STORAGE_KEY, String(s)); } catch(e) {}
    return s;
  }
  function publish(stage, gain, source){
    var s = clampStage(stage);
    var g = Number(gain || getGain(s));
    try {
      document.documentElement.setAttribute('data-smfp-boost-stage', String(s));
      document.documentElement.setAttribute('data-smfp-boost-gain', String(g));
      document.documentElement.setAttribute('data-smfp-boost-danger', isDanger(s) ? '1' : '0');
      document.body && document.body.setAttribute('data-boost-level', String(s));
      document.body && document.body.setAttribute('data-mobile-boost', String(s));
      document.documentElement.style.setProperty('--boost-level', String(s));
      document.documentElement.style.setProperty('--player-boost-level', String(s));
      document.documentElement.style.setProperty('--player-boost-gain', g.toFixed(2));
      window.__boostLevel = s;
      window.dispatchEvent(new CustomEvent('smfpboostchange', { detail:{ stage:s, gain:g, label:getLabel(s), danger:isDanger(s), source:source||'core' } }));
      window.dispatchEvent(new CustomEvent('playerboostchange', { detail:{ level:s, gain:g, label:getLabel(s), danger:isDanger(s), source:source||'core' } }));
    } catch(e) {}
    return s;
  }
  window.SMFPBoostCore = {
    version: 'v192-boost-audible-stages',
    storageKey: STORAGE_KEY,
    stages: STAGES.slice(),
    maxStage: maxStage,
    clampStage: clampStage,
    getStageInfo: getStageInfo,
    getGain: getGain,
    getLabel: getLabel,
    isDanger: isDanger,
    loadStage: loadStage,
    saveStage: saveStage,
    publish: publish
  };
})();
