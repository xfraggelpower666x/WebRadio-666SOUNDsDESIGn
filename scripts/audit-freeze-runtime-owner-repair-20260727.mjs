import fs from 'node:fs';

const files = ['index.html', 'public/index.html'];

function replaceFunction(source, name, replacement, required = true) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) {
    if (required) throw new Error(`Missing function ${name}`);
    return source;
  }
  const open = source.indexOf('{', start);
  if (open < 0) throw new Error(`Missing body for ${name}`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(0, start) + replacement + source.slice(i + 1);
    }
  }
  throw new Error(`Unclosed function ${name}`);
}

const replacements = {
  getAudio: `function getAudio(){\n    return q('#radio')||q('audio')||null;\n  }`,
  setManualStreamTarget: `function setManualStreamTarget(target){\n    manualStreamTarget=(target==='backup')?'backup':'main';\n    document.documentElement.setAttribute('data-manual-stream-target',manualStreamTarget);\n    updateStreamSwitchButtons();\n    var canonical=document.getElementById(manualStreamTarget==='backup'?'fallbackBtn':'mainBtn');\n    if(canonical && typeof canonical.click==='function') canonical.click();\n    setPanelLedsFromMeta({source:manualStreamTarget,dj:'DJ-666'});\n  }`,
  play: `async function play(){\n    mffUserStopped=false;\n    setMffTickerLoadingV113();\n    var canonical=document.getElementById('playBtn');\n    if(canonical && typeof canonical.click==='function') canonical.click();\n    setTransportState('play');\n    setTimeout(function(){setPanelLedsFromMeta({source:manualStreamTarget,dj:'DJ-666'});},80);\n    setTimeout(function(){tickMeta();},120);\n  }`,
  pause: `function pause(){\n    mffUserStopped=true;\n    mffLastUserStopAt=Date.now();\n    var canonical=document.getElementById('pauseBtn');\n    if(canonical && typeof canonical.click==='function') canonical.click();\n    setTransportState('pause');\n    setMffTickerIdleV113();\n  }`,
  stop: `function stop(){\n    mffUserStopped=true;\n    mffLastUserStopAt=Date.now();\n    var canonical=document.getElementById('stopBtn');\n    if(canonical && typeof canonical.click==='function') canonical.click();\n    setTransportState('stop');\n    setMffTickerIdleV113();\n  }`,
  resumeAudioGraph: `async function resumeAudioGraph(){\n    try{\n      var ctx=window.__radioAudioContext;\n      if(ctx && ctx.state==='suspended') await ctx.resume();\n    }catch(e){}\n    return true;\n  }`,
  ensureAudioGraph: `function ensureAudioGraph(){\n    return null;\n  }`,
  resetMffAudioGraph: `function resetMffAudioGraph(){\n    audioGraph=null;\n  }`
};

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  text = replaceFunction(text, 'getAudio', replacements.getAudio);
  text = replaceFunction(text, 'setManualStreamTarget', replacements.setManualStreamTarget);
  text = replaceFunction(text, 'play', replacements.play);
  text = replaceFunction(text, 'pause', replacements.pause);
  text = replaceFunction(text, 'stop', replacements.stop);
  text = replaceFunction(text, 'resumeAudioGraph', replacements.resumeAudioGraph, false);
  text = replaceFunction(text, 'ensureAudioGraph', replacements.ensureAudioGraph, false);
  text = replaceFunction(text, 'resetMffAudioGraph', replacements.resetMffAudioGraph, false);
  if (/createElement\(['"]audio['"]\)/.test(text)) throw new Error(`${file}: mobile runtime still creates audio element`);
  fs.writeFileSync(file, text);
}

const test = `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\nconst html=fs.readFileSync('index.html','utf8');\nconst publicHtml=fs.readFileSync('public/index.html','utf8');\n\ntest('mobile UI delegates transport to canonical player core',()=>{\n  assert.match(html,/return q\\('#radio'\\)\\|\\|q\\('audio'\\)\\|\\|null/);\n  assert.match(html,/getElementById\\('playBtn'\\)/);\n  assert.match(html,/getElementById\\('pauseBtn'\\)/);\n  assert.match(html,/getElementById\\('stopBtn'\\)/);\n  assert.doesNotMatch(html,/createElement\\(['\\\"]audio['\\\"]\\)/);\n  assert.equal(html,publicHtml);\n});\n`;
fs.writeFileSync('tests/player-runtime-single-audio-owner-contract.test.mjs', test);
