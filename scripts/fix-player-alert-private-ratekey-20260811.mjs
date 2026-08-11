import fs from 'node:fs';

const workerPaths = ['worker.js', 'workers/webradio-666soundsdesign-worker/worker.js'];
for (const path of workerPaths) {
  let text = fs.readFileSync(path, 'utf8');
  const oldBlock = "const alert = {ok:true,active:true,id:String(now)+'-'+Math.random().toString(36).slice(2,8),message,username,senderId,clientId:senderId,createdAt:new Date(now).toISOString(),timestamp:now,version:playerAlertCleanText(payload.version||''),source:playerAlertCleanText(payload.source||'web-player'),rateKey};\n    const backend = await playerAlertBackendFetch(env, '/send', {method:'POST', body:JSON.stringify(alert)});";
  const newBlock = "const alert = {ok:true,active:true,id:String(now)+'-'+Math.random().toString(36).slice(2,8),message,username,senderId,clientId:senderId,createdAt:new Date(now).toISOString(),timestamp:now,version:playerAlertCleanText(payload.version||''),source:playerAlertCleanText(payload.source||'web-player')};\n    const backendAlert = Object.assign({}, alert, {rateKey});\n    const backend = await playerAlertBackendFetch(env, '/send', {method:'POST', body:JSON.stringify(backendAlert)});";
  if (!text.includes(oldBlock) && !text.includes(newBlock)) throw new Error(`Player Alert send block not found in ${path}`);
  text = text.replace(oldBlock, newBlock);
  fs.writeFileSync(path, text, 'utf8');
}

const testPath = 'tests/player-alert-global-backend-repair.test.mjs';
let test = fs.readFileSync(testPath, 'utf8');
test = test.replace(
  "assert.match(worker, /source:playerAlertCleanText\\(payload\\.source\\|\\|'web-player'\\),rateKey\\};\\s*const backend = await playerAlertBackendFetch\\(env, '\\/send'/);",
  "assert.match(worker, /const backendAlert = Object\\.assign\\(\\{\\}, alert, \\{rateKey\\}\\);\\s*const backend = await playerAlertBackendFetch\\(env, '\\/send', \\{method:'POST', body:JSON\\.stringify\\(backendAlert\\)\\}\\)/);\n  assert.doesNotMatch(worker, /const alert = \\{[^\\n]*rateKey[^\\n]*\\};/);"
);
fs.writeFileSync(testPath, test, 'utf8');

if (fs.readFileSync(workerPaths[0], 'utf8') !== fs.readFileSync(workerPaths[1], 'utf8')) throw new Error('worker mirrors diverged');
console.log('rateKey is now backend-only and not exposed in public fallback payloads.');
