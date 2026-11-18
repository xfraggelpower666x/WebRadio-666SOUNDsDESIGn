(() => {
  const button = document.getElementById('rw-gov');
  const panel = document.getElementById('rw-govee');
  if (!button || !panel || !window.api?.goveeUnlock) return;
  const login = panel.querySelector('form');
  const password = login.querySelector('input');
  const controls = panel.querySelector('fieldset');
  const status = document.getElementById('rw-govee-status');
  const byId = id => document.getElementById(id);
  const mode = byId('govee-mode');
  const transport = byId('govee-transport');
  const localControls = byId('govee-local-controls');
  const goveeTarget = byId('govee-local-target');
  let selectedTransport = 'bridge3000';
  const color = panel.querySelector('input[type=color]');
  const brightness = panel.querySelector('input[type=range]');
  const sync = panel.querySelector('input[type=checkbox]');
  const runtime = window.SoundwaveRuntime;
  let interval = 0;
  let busy = false;
  let spectrum;
  let generation = 0;

  const asusDevice = document.getElementById('asus-openrgb-device');
  const asusStatus = document.getElementById('asus-openrgb-status');
  if (asusDevice && window.api.asusControl) {
    for (const action of ['choose','list','apply','off']) {
      document.getElementById('asus-openrgb-'+action).addEventListener('click',async()=>{
        const attempt=generation;
        try {
          const changeColor=action==='apply'||action==='off';
          if(changeColor&&!asusDevice.value)throw new Error('Choose a detected ASUS device.');
          const result=await window.api.asusControl(changeColor?'color':action,changeColor?{
            i:Number(asusDevice.value),
            color:action==='off'?'000000':document.getElementById('asus-openrgb-color').value.slice(1)
          }:undefined);
          if(attempt!==generation||result===null)return;
          if(changeColor)asusStatus.textContent='Color command accepted by OpenRGB.';
          else {
            asusDevice.replaceChildren(new Option('Choose ASUS device',''));
            for(const item of result)asusDevice.add(new Option(item.name,String(item.i)));
            asusStatus.textContent=result.length?result.length+' compatible ASUS device(s).':'No compatible ASUS device reported. Check the local SDK Server.';
          }
        } catch(error) { if(attempt===generation)asusStatus.textContent=String(error.message||error).split('Error: ').at(-1); }
      });
    }
  }

  const auraDevice = byId('asus-aura-device');
  const auraStatus = byId('asus-aura-status');
  const auraBass = byId('asus-aura-bass');
  const auraApply = byId('asus-aura-apply');
  const auraRelease = byId('asus-aura-release');
  let auraInterval = 0;
  let auraInFlight;
  let selectedAuraDevice = '';
  let auraHasColor = false;

  function clearAuraBass() {
    clearInterval(auraInterval);
    auraInterval = 0;
    auraHasColor = false;
    auraBass.checked = false;
    auraBass.disabled = true;
  }

  async function sendAura(action, value) {
    if (auraInFlight || controls.disabled) return false;
    const attempt = generation;
    try {
      auraInFlight = window.api.asusAura(action, value);
      const result = await auraInFlight;
      if (attempt !== generation) return false;
      if (action === 'acquire') {
        auraDevice.replaceChildren(...result.devices.map(name => new Option(name, name)));
        selectedAuraDevice = auraDevice.value = result.selected;
        auraDevice.disabled = auraApply.disabled = auraRelease.disabled = false;
        auraStatus.textContent = 'Aura übernommen · ' + result.selected;
      } else if (action === 'select') {
        selectedAuraDevice = value;
      } else if (action === 'release') {
        selectedAuraDevice = '';
        auraDevice.replaceChildren();
        auraDevice.disabled = auraApply.disabled = auraRelease.disabled = true;
        auraStatus.textContent = 'Aura freigegeben.';
      } else if (action === 'color') {
        auraHasColor = true;
        auraBass.disabled = false;
        auraStatus.textContent = 'Aura-Dienst hat die Farbe quittiert.';
      }
      return true;
    } catch (error) {
      if (attempt !== generation) return false;
      if (action === 'bass') clearAuraBass();
      auraStatus.textContent = String(error.message || error).split('Error: ').at(-1);
      return false;
    } finally {
      auraInFlight = undefined;
    }
  }

  byId('asus-aura-acquire').addEventListener('click', () => {
    if (window.confirm('Aura übernehmen? Beim Freigeben setzt ASUS die Aura-Geräte auf ihren Standardeffekt zurück.')) {
      void sendAura('acquire');
    }
  });
  auraRelease.addEventListener('click', async () => {
    const attempt = generation;
    clearAuraBass();
    if (auraInFlight) await auraInFlight.catch(() => {});
    if (attempt === generation) await sendAura('release');
  });
  auraDevice.addEventListener('change', async () => {
    const attempt = generation;
    const device = auraDevice.value;
    clearAuraBass();
    if (auraInFlight) await auraInFlight.catch(() => {});
    if (attempt === generation && !await sendAura('select', device)) auraDevice.value = selectedAuraDevice;
  });
  auraApply.addEventListener('click', () => void sendAura('color', byId('asus-aura-color').value.slice(1)));
  auraBass.addEventListener('change', () => {
    clearInterval(auraInterval);
    auraInterval = 0;
    if (auraBass.checked) {
      auraInterval = setInterval(() => {
        const bands = readBands();
        if (auraHasColor && bands) void sendAura('bass', bands.bass / 255);
      }, 130);
    } else if (auraHasColor) {
      void sendAura('color', byId('asus-aura-color').value.slice(1));
    }
  });

  function reset() {
    ++generation;
    clearInterval(interval);
    interval = 0;
    sync.checked = false;
    selectedTransport = transport.value = 'bridge3000';
    localControls.hidden = true;
    goveeTarget.replaceChildren();
    goveeTarget.disabled = false;
    clearAuraBass();
    selectedAuraDevice = '';
    auraDevice.replaceChildren();
    auraDevice.disabled = auraApply.disabled = auraRelease.disabled = true;
    auraStatus.textContent = '';
    login.hidden = false;
    login.reset();
    asusDevice?.replaceChildren();
    if (asusStatus) asusStatus.textContent = '';
    controls.hidden = true;
    controls.disabled = true;
  }

  button.addEventListener('click', () => {
    reset();
    status.textContent = '';
    panel.showModal();
  });

  panel.querySelector('[data-close]').addEventListener('click', () => panel.close());
  panel.addEventListener('close', () => {
    if (panel.open) return;
    reset();
    void window.api.goveeClose().catch(() => {});
  });

  login.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = login.querySelector('button');
    if (submit.disabled) return;
    submit.disabled = true;
    const attempt = generation;
    const entered = password.value;
    password.value = '';
    try {
      await window.api.goveeUnlock(entered);
      if (attempt !== generation || !panel.open) return;
      login.hidden = true;
      controls.hidden = false;
      controls.disabled = false;
      status.textContent = 'Freigabe aktiv. Wähle eine laufende Govee-Bridge oder eine ASUS-Steuerung.';
    } catch {
      if (attempt === generation) status.textContent = 'Anmeldung abgelehnt oder Admin-Prüfung nicht erreichbar.';
    } finally {
      submit.disabled = false;
    }
  });

  async function send(action, value) {
    if (busy || controls.disabled) {
      if (busy && action !== 'audio') status.textContent = 'Bridge beschäftigt. Bitte erneut versuchen.';
      return false;
    }
    const attempt = generation;
    busy = true;
    goveeTarget.disabled = true;
    try {
      const result = await window.api.goveeCommand(action, value);
      if (attempt !== generation) return false;
      if (action === 'devices') {
        goveeTarget.replaceChildren(new Option('Gerät wählen', ''),
          ...result.devices.map(device => new Option(device.label, device.id)));
        status.textContent = result.devices.length ? 'Geräteliste geladen. Wähle ein Ziel.' : 'Keine konfigurierten Geräte gemeldet.';
      } else if (action !== 'audio') {
        status.textContent = result?.udpSent ? 'UDP gesendet. Gerätewirkung unbestätigt.'
          : result?.configured ? 'Einstellung übernommen.' : 'Bridge hat den Befehl quittiert. Gerätewirkung unbestätigt.';
      }
      return true;
    } catch (error) {
      if (attempt !== generation) return false;
      clearInterval(interval);
      interval = 0;
      sync.checked = false;
      if (String(error?.message).includes('govee_auth_required')) {
        reset();
        status.textContent = 'Freigabe abgelaufen. Bitte erneut anmelden.';
      } else {
        const reason = String(error.message || error);
        const errors = {
          govee_bridge_invalid_ack: 'Antwort ohne gültige Bridge-Quittung.',
          govee_local_color_sent_brightness_failed: 'Farbpaket gesendet, Helligkeit fehlgeschlagen.',
          govee_local_choose_device: 'Bitte zuerst eine Geräteliste laden und ein Ziel wählen.',
          govee_stop_sync_first: 'Bitte zuerst die Audio-Reaktivität ausschalten.'
        };
        status.textContent = Object.entries(errors).find(([code]) => reason.includes(code))?.[1]
          || 'Lokale Govee-Bridge nicht erreichbar oder Befehl abgelehnt.';
        if (action === 'audio') void window.api.goveeCommand('enabled', false).catch(() => {});
      }
      return false;
    } finally {
      busy = false;
      goveeTarget.disabled = sync.checked;
    }
  }

  transport.addEventListener('change', async () => {
    if (sync.checked) {
      transport.value = selectedTransport;
      status.textContent = 'Bitte zuerst die Audio-Reaktivität ausschalten.';
      return;
    }
    const next = transport.value;
    if (await send('transport', next)) {
      selectedTransport = next;
      localControls.hidden = next !== 'local8766';
      goveeTarget.replaceChildren();
      if (next === 'local8766') await send('target', '');
    } else transport.value = selectedTransport;
  });
  byId('govee-local-scan').addEventListener('click', () => {
    if (!sync.checked) void send('devices');
    else status.textContent = 'Bitte zuerst die Audio-Reaktivität ausschalten.';
  });
  goveeTarget.addEventListener('change', () => {
    if (!sync.checked) void send('target', goveeTarget.value);
  });

  function readBands() {
    const audio = runtime?.audio;
    const analyser = runtime?.getAnalyser();
    if (!audio || audio.paused || audio.ended || audio.readyState < 2 ||
        !analyser || analyser.context.state !== 'running') return;
    if (spectrum?.length !== analyser.frequencyBinCount) spectrum = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(spectrum);
    const binHz = analyser.context.sampleRate / analyser.fftSize;
    const average = (from, to) => {
      const first = Math.max(1, Math.ceil(from / binHz));
      const last = Math.min(spectrum.length, Math.ceil(to / binHz));
      let sum = 0;
      for (let i = first; i < last; i++) sum += spectrum[i];
      return last > first ? Math.round(sum / (last - first)) : 0;
    };
    const bass = average(25, 160);
    const mid = average(160, 2500);
    const high = average(2500, 12000);
    return { bass, mid, high, energy: Math.round((bass + mid + high) / 3) };
  }

  function frame() {
    if (!sync.checked) return;
    const bands = readBands();
    if (bands) void send('audio', bands);
  }

  sync.addEventListener('change', async () => {
    clearInterval(interval);
    interval = 0;
    if (busy) {
      sync.checked = !sync.checked;
      if (sync.checked) interval = setInterval(frame, 100);
      return;
    }
    sync.disabled = true;
    try {
      if (await send('enabled', sync.checked) && sync.checked && panel.open) {
        interval = setInterval(frame, 100);
      } else {
        sync.checked = false;
      }
    } finally {
      sync.disabled = false;
      goveeTarget.disabled = sync.checked;
    }
  });
  mode.addEventListener('change', () => void send('mode', mode.value));
  controls.querySelectorAll('[data-action]').forEach(control => {
    control.addEventListener('click', () => {
      const action = control.dataset.action;
      if (action !== 'color') {
        void send(action);
        return;
      }
      const [r, g, b] = color.value.slice(1).match(/../g).map(value => parseInt(value, 16));
      void send('color', { r, g, b, brightness: Number(brightness.value) });
    });
  });
})();
