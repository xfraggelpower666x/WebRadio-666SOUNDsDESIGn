(() => {
  if (new URLSearchParams(location.search).has('output') || !window.api) return;
  const byId = id => document.getElementById(id);
  const targets = byId('light-targets');
  const aura = byId('light-aura');
  const reactive = byId('light-reactive');
  const apply = byId('light-apply');
  const load = byId('light-devices');
  const status = byId('light-status');
  const report = message => { status.textContent = message; };
  let auraReady = false;
  let auraScene = false;
  let bassBusy = false;
  let nextBass = 0;
  let lastBass;

  load.addEventListener('click', async () => {
    load.disabled = true;
    const selected = new Set([...targets.querySelectorAll(':checked')].map(node => node.value));
    targets.replaceChildren();
    try {
      const devices = await window.api.lightDevices();
      for (const device of devices) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = device.id;
        input.checked = selected.has(device.id);
        label.append(input, document.createTextNode(' ' + device.label));
        targets.append(label, document.createElement('br'));
      }
      report(devices.length ? 'Govee-Geräte geladen.' : 'Keine RGB-fähigen Geräte gemeldet.');
    } catch (error) {
      report('Govee · ' + error.message + ' · Radio-Admin-Anmeldung prüfen.');
    } finally {
      load.disabled = false;
    }
  });

  aura.addEventListener('change', async () => {
    const enabled = aura.checked;
    if (enabled && !window.confirm('Aura übernimmt die Beleuchtungssteuerung. Beim Freigeben setzt ASUS die Aura-Geräte auf ihren Standardeffekt zurück. Aura jetzt aktivieren?')) {
      aura.checked = false;
      return;
    }
    aura.disabled = true;
    apply.disabled = true;
    auraScene = false;
    try {
      const keyboard = await window.api.lightAura(enabled);
      auraReady = enabled;
      reactive.disabled = !enabled;
      report(enabled ? 'Aura · ' + keyboard + ' erkannt.' : 'Aura freigegeben.');
    } catch (error) {
      auraReady = false;
      aura.checked = !enabled;
      reactive.disabled = true;
      report('Aura · ' + error.message);
    } finally {
      aura.disabled = false;
      apply.disabled = false;
    }
  });

  reactive.addEventListener('change', () => { lastBass = undefined; });
  apply.addEventListener('click', async () => {
    apply.disabled = true;
    aura.disabled = true;
    const ids = [...targets.querySelectorAll(':checked')].map(node => node.value);
    try {
      const results = await window.api.lightApply(byId('light-scene').value, ids, auraReady);
      auraScene = results.some(result => result.name === 'Aura' && result.ok);
      lastBass = undefined;
      report(results.map(result => result.name + ' · ' + result.message).join(' | '));
    } catch (error) {
      report(error.message);
    } finally {
      aura.disabled = false;
      apply.disabled = false;
    }
  });

  window.RWLightBass = level => {
    if (!auraReady || !auraScene || !reactive.checked || apply.disabled || bassBusy ||
        !Number.isFinite(level) || performance.now() < nextBass) return;
    const step = Math.round(Math.max(0, Math.min(1, level)) * 8) / 8;
    if (step === lastBass) return;
    nextBass = performance.now() + 130;
    bassBusy = true;
    window.api.lightBass(step).then(() => { lastBass = step; }).catch(error => {
      reactive.checked = false;
      report('Aura · Bassreaktion beendet · ' + error.message);
    }).finally(() => { bassBusy = false; });
  };
})();
