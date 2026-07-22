/*
==========================================
DATEI: js/boost-core.js
VERSION: CENTRAL_AUDIO_POLICY_v2.0.0
ZWECK:
- Eine zentrale Boost-, EQ-, AudioContext- und Gerätepolicy für alle Player.
- Mobile Geräte: Boost 0–5, Hardware-Lautstärke, kein Player-Volume-Regler.
- Desktop: Boost 0–1, Player-Volume-Regler erlaubt.
- Zentrale lineare Boost-Rampe aus FULLPACK v34.3: 160 ms.
- Bestehende Audio-Graphen werden registriert und weiterverwendet.
==========================================
*/
(function(){
  'use strict';

  if (window.SMFPBoostCore?.centralPolicyVersion === '2.0.0') return;

  var STORAGE_KEY = 'smfp_audio_boost_stage_v177';
  var EQ_STORAGE_KEY = 'smfp_audio_eq_v2';
  var RAMP_SECONDS = 0.16;
  var EQ_RAMP_SECONDS = 0.08;
  var STAGES = [
    { stage:0, gain:1.00, label:'BST 0', danger:false },
    { stage:1, gain:1.26, label:'BST 1', danger:false },
    { stage:2, gain:1.78, label:'BST 2', danger:false },
    { stage:3, gain:2.24, label:'BST 3', danger:false },
    { stage:4, gain:2.82, label:'BST 4', danger:true  },
    { stage:5, gain:3.98, label:'BST 5', danger:true  }
  ];
  var EQ_BANDS = [
    { key:'sub', aliases:['sub','low'], type:'lowshelf', freq:55, q:0.70 },
    { key:'low', aliases:['low','lowMid'], type:'peaking', freq:160, q:0.95 },
    { key:'mid', aliases:['mid'], type:'peaking', freq:1000, q:1.00 },
    { key:'high', aliases:['high','highMid'], type:'peaking', freq:3600, q:0.90 },
    { key:'air', aliases:['air','high'], type:'highshelf', freq:10500, q:0.70 }
  ];

  var graphs = new WeakMap();
  var desired = new WeakMap();
  var patched = false;

  function isMobileDevice(){
    try {
      return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(max-width: 860px)').matches;
    } catch (_) {
      return window.innerWidth <= 860;
    }
  }

  function deviceProfile(){
    var mobile = isMobileDevice();
    return Object.freeze({
      id: mobile ? 'mobile' : 'desktop',
      mobile: mobile,
      maxBoostStage: mobile ? 5 : 1,
      playerVolume: !mobile,
      hardwareVolume: mobile,
      rampSeconds: RAMP_SECONDS,
      eqRampSeconds: EQ_RAMP_SECONDS
    });
  }

  function maxStage(){ return deviceProfile().maxBoostStage; }

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

  function clampDb(value){
    var n = Number(value);
    if (!isFinite(n)) n = 0;
    return Math.max(-12, Math.min(12, Math.round(n)));
  }

  function loadEq(){
    var fallback = { sub:0, low:0, mid:0, high:0, air:0 };
    try {
      var parsed = JSON.parse(localStorage.getItem(EQ_STORAGE_KEY) || '{}');
      Object.keys(fallback).forEach(function(key){
        if (Object.prototype.hasOwnProperty.call(parsed, key)) fallback[key] = clampDb(parsed[key]);
      });
    } catch (_) {}
    return fallback;
  }

  function saveEq(values){
    var normalized = normalizeEq(values);
    try { localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify(normalized)); } catch (_) {}
    return normalized;
  }

  function normalizeEq(values){
    values = values || {};
    var velunaShape = Object.prototype.hasOwnProperty.call(values, 'sub') || Object.prototype.hasOwnProperty.call(values, 'air');
    if (velunaShape) {
      return {
        sub: clampDb(values.sub),
        low: clampDb(values.low),
        mid: clampDb(values.mid),
        high: clampDb(values.high),
        air: clampDb(values.air)
      };
    }
    return {
      sub: clampDb(values.low),
      low: clampDb(values.lowMid),
      mid: clampDb(values.mid),
      high: clampDb(values.highMid),
      air: clampDb(values.high)
    };
  }

  function stateFor(audio){
    if (!audio) return { stage:0, eq:loadEq() };
    var state = desired.get(audio);
    if (!state) {
      state = { stage:loadStage(), eq:loadEq() };
      desired.set(audio, state);
    }
    return state;
  }

  function graphFor(audio){
    if (!audio) return null;
    var graph = graphs.get(audio);
    if (!graph) {
      graph = { audio:audio, context:null, source:null, gains:[], filters:[], limiter:null, analyser:null, createdByCore:false };
      graphs.set(audio, graph);
    }
    return graph;
  }

  function nodeType(node){
    var name = String(node?.constructor?.name || '');
    if (/BiquadFilter/i.test(name) || (node?.frequency && node?.gain && typeof node.type === 'string')) return 'filter';
    if (/DynamicsCompressor/i.test(name) || (node?.threshold && node?.ratio && node?.attack)) return 'limiter';
    if (/Analyser/i.test(name) || (typeof node?.fftSize === 'number' && typeof node?.getByteFrequencyData === 'function')) return 'analyser';
    if (/GainNode/i.test(name) || (node?.gain && !node?.frequency && !node?.threshold)) return 'gain';
    return 'other';
  }

  function registerNode(audio, node, context){
    if (!audio || !node) return;
    try { node.__smfpAudioElement = audio; } catch (_) {}
    var graph = graphFor(audio);
    graph.context = context || node.context || graph.context;
    var type = nodeType(node);
    if (type === 'gain' && graph.gains.indexOf(node) < 0) graph.gains.push(node);
    if (type === 'filter' && graph.filters.indexOf(node) < 0) graph.filters.push(node);
    if (type === 'limiter') graph.limiter = node;
    if (type === 'analyser') graph.analyser = node;
    scheduleApply(audio, 'node-register');
  }

  function installGraphInstrumentation(){
    if (patched) return;
    patched = true;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var AudioNodeCtor = window.AudioNode;
      if (!Ctx?.prototype || !AudioNodeCtor?.prototype) return;

      var nativeCreateSource = Ctx.prototype.createMediaElementSource;
      if (nativeCreateSource && !nativeCreateSource.__smfpWrapped) {
        var wrappedCreateSource = function(media){
          var source = nativeCreateSource.call(this, media);
          try { source.__smfpAudioElement = media; } catch (_) {}
          var graph = graphFor(media);
          graph.context = this;
          graph.source = source;
          return source;
        };
        wrappedCreateSource.__smfpWrapped = true;
        Ctx.prototype.createMediaElementSource = wrappedCreateSource;
      }

      var nativeConnect = AudioNodeCtor.prototype.connect;
      if (nativeConnect && !nativeConnect.__smfpWrapped) {
        var wrappedConnect = function(destination){
          var result = nativeConnect.apply(this, arguments);
          try {
            var audio = this.__smfpAudioElement;
            if (audio && destination) registerNode(audio, destination, this.context || destination.context);
          } catch (_) {}
          return result;
        };
        wrappedConnect.__smfpWrapped = true;
        AudioNodeCtor.prototype.connect = wrappedConnect;
      }
    } catch (_) {}
  }

  function rampParam(param, target, seconds){
    if (!param) return false;
    var context = param.context || null;
    var now = context?.currentTime || 0;
    var duration = Math.max(0.01, Number(seconds) || RAMP_SECONDS);
    try {
      param.cancelScheduledValues(now);
      param.setValueAtTime(Number(param.value) || 0, now);
      param.linearRampToValueAtTime(Number(target), now + duration);
      return true;
    } catch (_) {
      try {
        param.setTargetAtTime(Number(target), now, Math.max(0.01, duration / 3));
        return true;
      } catch (__) {
        try { param.value = Number(target); return true; } catch (___) { return false; }
      }
    }
  }

  async function resume(audio){
    var graph = graphFor(audio);
    var context = graph?.context;
    if (!context) return false;
    try {
      if (context.state === 'suspended' || context.state === 'interrupted') await context.resume();
      return context.state === 'running';
    } catch (_) {
      return false;
    }
  }

  function applyBoost(audio, stage, source){
    if (!audio) return 0;
    var safeStage = clampStage(stage);
    var targetGain = getGain(safeStage);
    var state = stateFor(audio);
    state.stage = safeStage;
    saveStage(safeStage);
    var graph = graphFor(audio);
    var gainNode = graph?.gains?.[0] || null;
    var graphState = gainNode ? 'GRAPH_OK' : (audio.dataset?.audioChain === 'webaudio-unavailable' ? 'GRAPH_FAIL' : 'GRAPH_WAIT');
    if (gainNode) rampParam(gainNode.gain, targetGain, RAMP_SECONDS);
    try {
      audio.dataset.boostStage = String(safeStage);
      audio.dataset.boostGain = String(targetGain);
      audio.dataset.boostGraph = graphState;
      audio.dataset.boostContext = graph?.context?.state || 'NO_CONTEXT';
      audio.dispatchEvent(new CustomEvent('boost-diagnostic', { detail:{
        stage:safeStage,
        gain:targetGain,
        graph:graphState,
        context:graph?.context?.state || 'NO_CONTEXT',
        profile:deviceProfile().id,
        maxStage:maxStage(),
        rampMs:Math.round(RAMP_SECONDS * 1000),
        source:source || 'central-core'
      }}));
    } catch (_) {}
    updateSoundStatus(audio, graphState, state.eq);
    return safeStage;
  }

  function valuesToArray(values){
    var normalized = normalizeEq(values);
    return [normalized.sub, normalized.low, normalized.mid, normalized.high, normalized.air];
  }

  function applyEq(audio, values, source){
    if (!audio) return normalizeEq(values);
    var normalized = saveEq(values);
    var state = stateFor(audio);
    state.eq = normalized;
    var graph = graphFor(audio);
    var ordered = valuesToArray(normalized);
    (graph?.filters || []).slice(0, 5).forEach(function(node, index){
      rampParam(node.gain, ordered[index] || 0, EQ_RAMP_SECONDS);
    });
    try {
      audio.dataset.eqGraph = graph?.filters?.length ? 'GRAPH_OK' : 'GRAPH_WAIT';
      audio.dataset.eqContext = graph?.context?.state || 'NO_CONTEXT';
      audio.dataset.eqState = JSON.stringify(normalized);
      window.dispatchEvent(new CustomEvent('smfpeqchange', { detail:{
        values:normalized,
        graph:audio.dataset.eqGraph,
        context:audio.dataset.eqContext,
        source:source || 'central-core'
      }}));
    } catch (_) {}
    updateSoundStatus(audio, audio.dataset?.eqGraph || 'GRAPH_WAIT', normalized);
    return normalized;
  }

  function updateSoundStatus(audio, graphState, eq){
    var status = document.getElementById('soundStatus');
    if (!status) return;
    var state = stateFor(audio);
    var profile = deviceProfile();
    var values = eq || state.eq || loadEq();
    var changed = Object.keys(values).some(function(key){ return Number(values[key]) !== 0; });
    status.textContent = 'CENTRAL SOUND · ' + profile.id.toUpperCase() +
      ' · BOOST ' + state.stage + '/' + profile.maxBoostStage +
      ' · EQ ' + (changed ? 'ACTIVE' : 'FLAT') +
      ' · ' + String(graphState || 'GRAPH_WAIT') +
      ' · RAMP 160ms';
  }

  function publish(stage, gain, source){
    var s = clampStage(stage);
    var g = getGain(s);
    try {
      document.documentElement.setAttribute('data-smfp-boost-stage', String(s));
      document.documentElement.setAttribute('data-smfp-boost-gain', String(g));
      document.documentElement.setAttribute('data-smfp-boost-danger', isDanger(s) ? '1' : '0');
      document.documentElement.setAttribute('data-smfp-audio-profile', deviceProfile().id);
      document.body && document.body.setAttribute('data-boost-level', String(s));
      document.body && document.body.setAttribute('data-mobile-boost', String(s));
      document.documentElement.style.setProperty('--boost-level', String(s));
      document.documentElement.style.setProperty('--player-boost-level', String(s));
      document.documentElement.style.setProperty('--player-boost-gain', g.toFixed(2));
      window.__boostLevel = s;
      window.dispatchEvent(new CustomEvent('smfpboostchange', { detail:{ stage:s, gain:g, label:getLabel(s), danger:isDanger(s), source:source||'core', profile:deviceProfile().id, maxStage:maxStage() } }));
      window.dispatchEvent(new CustomEvent('playerboostchange', { detail:{ level:s, gain:g, label:getLabel(s), danger:isDanger(s), source:source||'core', profile:deviceProfile().id, maxStage:maxStage() } }));
    } catch(e) {}
    return s;
  }

  function scheduleApply(audio, source){
    if (!audio) return;
    clearTimeout(audio.__smfpCentralApplyTimer);
    audio.__smfpCentralApplyTimer = setTimeout(function(){
      var state = stateFor(audio);
      void resume(audio);
      applyBoost(audio, state.stage, source || 'scheduled');
      applyEq(audio, state.eq, source || 'scheduled');
    }, 0);
  }

  function ensureGraph(audio){
    if (!audio) return null;
    var graph = graphFor(audio);
    if (graph.source || audio.dataset?.audioChain === 'eq-boost-limiter-active') return graph;
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('no_audio_context');
      var context = new AudioCtx();
      var source = context.createMediaElementSource(audio);
      var filters = EQ_BANDS.map(function(band){
        var node = context.createBiquadFilter();
        node.type = band.type;
        node.frequency.value = band.freq;
        if (node.Q) node.Q.value = band.q;
        node.gain.value = 0;
        return node;
      });
      var gain = context.createGain();
      var limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -2.5;
      limiter.knee.value = 1.5;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.14;
      var analyser = context.createAnalyser();
      analyser.fftSize = isMobileDevice() ? 128 : 256;
      analyser.smoothingTimeConstant = 0.78;
      var node = source;
      filters.forEach(function(filter){ node.connect(filter); node = filter; });
      node.connect(gain);
      gain.connect(limiter);
      limiter.connect(analyser);
      analyser.connect(context.destination);
      graph.context = context;
      graph.source = source;
      graph.filters = filters;
      graph.gains = [gain];
      graph.limiter = limiter;
      graph.analyser = analyser;
      graph.createdByCore = true;
      audio.dataset.audioChain = 'central-eq-boost-limiter-active';
      scheduleApply(audio, 'ensure-graph');
      return graph;
    } catch (error) {
      audio.dataset.audioChain = audio.dataset.audioChain || 'webaudio-unavailable';
      audio.dataset.centralAudioError = String(error?.message || error || 'graph_error');
      return graph;
    }
  }

  function collectEqControls(){
    var values = {};
    document.querySelectorAll('[data-veluna-eq],[data-smfp-eq]').forEach(function(input){
      var key = input.getAttribute('data-veluna-eq') || input.getAttribute('data-smfp-eq');
      if (key) values[key] = input.value;
    });
    return values;
  }

  function applyVolumePolicy(root){
    root = root || document;
    var profile = deviceProfile();
    var selectors = '#volumeSlider,#velunaVolumeSlider,.volume-wrap,.veluna-volume-row,[data-player-volume],[data-veluna-volume],.smfp-desktop-volume-row';
    root.querySelectorAll(selectors).forEach(function(element){
      if (profile.hardwareVolume) {
        element.dataset.smfpPolicyHidden = '1';
        element.hidden = true;
        element.setAttribute('aria-hidden', 'true');
        if ('inert' in element) element.inert = true;
      } else if (element.dataset.smfpPolicyHidden === '1') {
        delete element.dataset.smfpPolicyHidden;
        element.hidden = false;
        element.removeAttribute('aria-hidden');
        if ('inert' in element) element.inert = false;
      }
    });
    root.querySelectorAll('audio').forEach(function(audio){
      if (profile.hardwareVolume) {
        try { audio.volume = 1; } catch (_) {}
      }
    });
    document.documentElement.setAttribute('data-smfp-volume-policy', profile.hardwareVolume ? 'hardware' : 'player');
    return profile;
  }

  function bindUi(){
    document.addEventListener('pointerdown', function(event){
      var control = event.target?.closest?.('[data-veluna-eq],[data-smfp-eq],[data-boost],[data-boost-stage],[data-boost-step]');
      if (!control) return;
      var audio = document.querySelector('audio');
      if (!audio) return;
      ensureGraph(audio);
      void resume(audio);
    }, true);

    document.addEventListener('input', function(event){
      if (!event.target?.matches?.('[data-veluna-eq],[data-smfp-eq]')) return;
      var audio = document.querySelector('audio');
      if (!audio) return;
      ensureGraph(audio);
      setTimeout(function(){ applyEq(audio, collectEqControls(), 'ui-input'); }, 0);
      setTimeout(function(){ applyEq(audio, collectEqControls(), 'ui-input-confirm'); }, 180);
    }, true);

    window.addEventListener('smfpboostchange', function(event){
      if (event.detail?.source === 'central-enforce') return;
      var audio = document.querySelector('audio');
      if (!audio) return;
      ensureGraph(audio);
      var stage = clampStage(event.detail?.stage ?? event.detail?.level ?? 0);
      var state = stateFor(audio);
      state.stage = stage;
      setTimeout(function(){ applyBoost(audio, stage, 'central-enforce'); }, 0);
      setTimeout(function(){ applyBoost(audio, stage, 'central-confirm'); }, 190);
    });

    document.addEventListener('s666:sound-boost', function(event){
      var audio = document.querySelector('audio');
      if (!audio) return;
      ensureGraph(audio);
      var stage = clampStage(event.detail?.stage || 0);
      stateFor(audio).stage = stage;
      applyBoost(audio, stage, 'sound-event');
    });

    document.addEventListener('s666:sound-eq', function(event){
      var audio = document.querySelector('audio');
      if (!audio) return;
      ensureGraph(audio);
      applyEq(audio, event.detail?.values || {}, 'sound-event');
    });

    ['resize','orientationchange'].forEach(function(name){
      window.addEventListener(name, function(){
        applyVolumePolicy(document);
        document.querySelectorAll('audio').forEach(function(audio){ scheduleApply(audio, 'profile-change'); });
      }, { passive:true });
    });

    var observer = new MutationObserver(function(){ applyVolumePolicy(document); });
    observer.observe(document.documentElement, { childList:true, subtree:true });
    applyVolumePolicy(document);
  }

  installGraphInstrumentation();

  window.SMFPBoostCore = {
    version: 'v192-boost-audible-stages + central-audio-policy-v2',
    centralPolicyVersion: '2.0.0',
    storageKey: STORAGE_KEY,
    eqStorageKey: EQ_STORAGE_KEY,
    stages: STAGES.slice(),
    eqBands: EQ_BANDS.map(function(band){ return Object.assign({}, band); }),
    rampSeconds: RAMP_SECONDS,
    eqRampSeconds: EQ_RAMP_SECONDS,
    isMobileDevice: isMobileDevice,
    deviceProfile: deviceProfile,
    maxStage: maxStage,
    clampStage: clampStage,
    getStageInfo: getStageInfo,
    getGain: getGain,
    getLabel: getLabel,
    isDanger: isDanger,
    loadStage: loadStage,
    saveStage: saveStage,
    loadEq: loadEq,
    saveEq: saveEq,
    normalizeEq: normalizeEq,
    publish: publish,
    rampAudioParam: rampParam,
    graphFor: graphFor,
    ensureGraph: ensureGraph,
    resume: resume,
    applyBoost: applyBoost,
    applyEq: applyEq,
    applyVolumePolicy: applyVolumePolicy,
    registerEngine: function(audio, engine){
      var graph = graphFor(audio);
      engine = engine || {};
      graph.context = engine.context || engine.ctx || graph.context;
      graph.source = engine.source || graph.source;
      graph.gains = engine.gainNode ? [engine.gainNode] : (engine.gains || graph.gains);
      graph.filters = engine.eqNodes || engine.filters || graph.filters;
      graph.limiter = engine.limiterNode || engine.limiter || graph.limiter;
      graph.analyser = engine.analyser || graph.analyser;
      scheduleApply(audio, 'manual-register');
      return graph;
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindUi, { once:true });
  else bindUi();
})();
