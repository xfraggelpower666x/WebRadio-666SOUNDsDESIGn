(() => {
  const button = document.getElementById('rw-gov');
  const panel = document.getElementById('rw-govee');
  if (!button || !panel || !window.api?.goveeUnlock) return;
  const login = panel.querySelector('form');
  const password = login.querySelector('input');
  const controls = panel.querySelector('fieldset');
  const status = document.getElementById('rw-govee-status');
  const mode = panel.querySelector('select');
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

  function reset() {
    ++generation;
    clearInterval(interval);
    interval = 0;
    sync.checked = false;
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
      status.textContent = 'Freigabe aktiv. Der lokale Govee-Bridge-Dienst muss laufen.';
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
    try {
      await window.api.goveeCommand(action, value);
      if (attempt !== generation) return false;
      if (action !== 'audio') status.textContent = 'Lokale Bridge hat den Befehl angenommen.';
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
        status.textContent = 'Lokale Govee-Bridge nicht erreichbar oder Befehl abgelehnt.';
        if (action === 'audio') void window.api.goveeCommand('enabled', false).catch(() => {});
      }
      return false;
    } finally {
      busy = false;
    }
  }

  function frame() {
    const audio = runtime?.audio;
    const analyser = runtime?.getAnalyser();
    if (!sync.checked || !audio || audio.paused || audio.ended || audio.readyState < 2 ||
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
    void send('audio', { bass, mid, high, energy: Math.round((bass + mid + high) / 3) });
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
