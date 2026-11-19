'use strict';

const { appendFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { createInterface } = require('node:readline/promises');
const { setTimeout: delay } = require('node:timers/promises');
const { createAuraRest } = require('../../../src/shared/asus-aura-rest.cjs');

const deviceUrl = 'http://127.0.0.1:27339/AuraSDK/AuraDevice';
const codeNames = {
  0: 'RESULT_SUCCESS',
  1: 'RESULT_NOT_READY',
  3: 'RESULT_INVALID_PARAMETER',
  5: 'RESULT_NOT_INIT',
  6: 'RESULT_NO_DEVICE',
  13: 'RESULT_CATEGORY_REDEFINED',
  15: 'RESULT_NOT_SDK_CATEGORY'
};

async function runAuraTest({ mode, ask, log, request = fetch, wait = delay, signal, platform = process.platform }) {
  if (platform !== 'win32') {
    log('Dieses Testtool benötigt Windows.');
    return 1;
  }

  let ownership = 'idle';
  let release = 'skipped';
  let colorSent = false;
  let status = 0;

  // Der Player-Adapter führt den Sitzungsablauf aus. Der Test erfasst
  // HTTP-Status und API-Ergebnis, damit der Bericht keine Rohantworten enthält.
  async function observedRequest(url, options) {
    const method = options.method;
    const route = new URL(url).pathname;
    if (method === 'POST') ownership = 'uncertain';
    if (method === 'DELETE') release = 'failed';
    try {
      const response = await request(url, options);
      log(method + ' ' + route + ' -> HTTP ' + response.status);
      if (!response.ok) return response;
      let body;
      try {
        body = await response.json();
      } catch {
        throw new Error('Aura-Antwort war kein lesbares JSON.');
      }
      const result = body?.result;
      if (!(Number.isSafeInteger(result) || (typeof result === 'string' && /^-?\d+$/.test(result)))) {
        throw new Error('Ungültiger oder fehlender Aura-Ergebniscode.');
      }
      const code = String(result);
      log('API-Code: ' + code + ' (' + (codeNames[code] || 'weiterer ASUS-Code') + ')');
      if (method === 'GET' && code === '0') {
        const types = Object.keys(body).filter(key => key !== 'result' && /^[A-Za-z0-9_]{1,48}$/.test(key));
        log('Gemeldete Aura-Gerätetypen: ' + (types.join(', ') || 'keine'));
      }
      if (method === 'POST') ownership = code === '0' ? 'owned' : 'idle';
      if (method === 'DELETE' && code === '0') {
        release = 'confirmed';
        ownership = 'idle';
      }
      return { ok: true, status: response.status, json: async () => body };
    } catch (error) {
      log(method + ' ' + route + ' fehlgeschlagen: ' + error.message);
      throw error;
    }
  }

  if (mode === 'diagnose') {
    try {
      const response = await observedRequest(deviceUrl, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(2500)
      });
      if (!response.ok) return 1;
      const body = await response.json();
      const code = String(body.result);
      if (code === '5') log('Lokaler Dienst erreichbar. SDK-Sitzung noch nicht initialisiert.');
      if (code === '0') log('Lokaler Dienst erreichbar. SDK ist bereits initialisiert.');
      return code === '5' || code === '0' ? 0 : 1;
    } catch {
      return 1;
    }
  }

  const aura = createAuraRest({ request: observedRequest, platform });
  try {
    log('INIT kann die Beleuchtung mehrerer Geräte übernehmen. Freigabe setzt den ASUS-Standardeffekt.');
    if (await ask('Zur Übernahme exakt INIT eingeben, sonst Enter zum Abbrechen: ') !== 'INIT') {
      log('Übernahme übersprungen.');
    } else {
      signal?.throwIfAborted();
      const auth = () => !signal?.aborted;
      const { devices, selected } = await aura.command('acquire', undefined, auth);
      log('Erkannte Notebook-Tastaturen: ' + devices.join(', '));
      if (await ask('Für einen kurzen Cyan-Test exakt RGB eingeben, sonst Enter zur Freigabe: ') === 'RGB') {
        signal?.throwIfAborted();
        await aura.command('color', '00ffff', auth);
        colorSent = true;
        log('Cyan quittiert für ' + selected + '. Sichtbare Gerätewirkung separat prüfen.');
        await wait(2000, undefined, { signal });
      }
    }
  } catch (error) {
    status = signal?.aborted ? 130 : 1;
    log(signal?.aborted ? 'Test abgebrochen.' : 'Kontrollierter Test: ' + error.message);
  } finally {
    // Bei Gerätefehlern kann der Player-Adapter bereits freigegeben haben.
    // Einen fehlgeschlagenen DELETE wiederholen wir bewusst nicht automatisch.
    if (ownership === 'owned' && release === 'skipped') {
      try {
        await aura.release();
      } catch (error) {
        log('Freigabe: ' + error.message);
      }
    }
    if (ownership === 'uncertain') {
      status = 4;
      log('Übernahme unklar. Aura-Zustand in Armoury Crate prüfen, bevor du erneut testest.');
    } else if (release === 'failed') {
      status = 3;
      log('Freigabe fehlgeschlagen. Aura-Zustand in Armoury Crate prüfen.');
    } else if (release === 'confirmed') {
      log('Freigabe vom Dienst bestätigt. ASUS-Standardeffekt am Gerät prüfen.');
    }
  }

  if (colorSent && status === 0) {
    try {
      for (const observation of ['Cyan sichtbar', 'ASUS-Standardeffekt wieder sichtbar']) {
        const answer = await ask(observation + '? [J/N/Enter] ');
        const result = { J: 'ja', N: 'nein' }[answer.trim().toUpperCase()];
        log(observation + ': ' + (result || 'nicht beurteilt'));
      }
    } catch {
      log('Gerätewirkung: nicht beurteilt.');
      status = 130;
    }
  }
  return status;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !['--diagnose', '--controlled'].includes(args[0]))) {
    console.error('Aufruf: node aura-test.cjs [--diagnose | --controlled]');
    return 2;
  }

  const reportDir = join(__dirname, 'Reports');
  mkdirSync(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const report = join(reportDir, 'ASUS_Aura_' + stamp + '_' + process.pid + '.txt');
  writeFileSync(report, '', { flag: 'wx' });
  let reportError = false;
  const log = message => {
    const line = new Date().toISOString() + '  ' + message;
    console.log(line);
    try {
      appendFileSync(report, line + '\n', 'utf8');
    } catch {
      // Ein volles Laufwerk darf die Aura-Freigabe nicht verhindern.
      reportError = true;
    }
  };

  const abort = new AbortController();
  const stop = () => abort.abort();
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  terminal.on('SIGINT', stop);
  terminal.once('close', stop);
  process.on('SIGINT', stop);
  const ask = question => terminal.question(question, { signal: abort.signal });
  try {
    let mode = args[0]?.slice(2);
    if (!mode) {
      console.log('1  Aura-Diagnose (nur GET)\n2  Kontrollierter Aura-Farbtest\nEnter  Beenden');
      const choice = await ask('Auswahl: ');
      if (!choice) return 0;
      if (choice !== '1' && choice !== '2') return 2;
      mode = choice === '1' ? 'diagnose' : 'controlled';
    }
    log('RADIO WAVE · ASUS Aura Test 1.0.0 · ' + mode);
    const status = await runAuraTest({ mode, ask, log, signal: abort.signal });
    log('Exitcode: ' + (status || (reportError ? 1 : 0)));
    return status || (reportError ? 1 : 0);
  } catch (error) {
    if (abort.signal.aborted) return 130;
    throw error;
  } finally {
    terminal.removeListener('close', stop);
    terminal.close();
    process.removeListener('SIGINT', stop);
    if (reportError) console.error('Bericht konnte nicht vollständig geschrieben werden.');
    console.log('Bericht: ' + report);
  }
}

if (require.main === module) {
  main().then(code => { process.exitCode = code; }, error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { runAuraTest };
