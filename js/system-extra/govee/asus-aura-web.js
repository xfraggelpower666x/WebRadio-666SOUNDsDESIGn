const endpoint = 'http://127.0.0.1:27340/aura';

export function bindAuraControls(panel, authorized) {
  const controls = panel.querySelector('[data-asus-aura]');
  if (!controls) return () => {};

  const get = name => controls.querySelector(`[data-aura-${name}]`);
  const output = get('status');
  const input = get('code');
  const select = get('device');
  const bass = get('bass');
  let code = '';
  let pending;
  let lastFrame = 0;

  async function request(action, value, session) {
    const response = await fetch(endpoint, {
      method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'error',
      targetAddressSpace: 'loopback', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session },
      body: JSON.stringify({ action, value })
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error(result.error || 'Aura HTTP ' + response.status);
    return result.result;
  }

  async function command(action, value, session = code) {
    if (!authorized() || pending || !session) return;
    pending = request(action, value, session);
    try {
      const result = await pending;
      if (action === 'acquire') {
        if (!authorized()) {
          await request('release', undefined, session);
          return;
        }
        code = session;
        input.value = '';
        select.replaceChildren(...result.devices.map(device => new Option(device, device)));
        select.value = result.selected;
        output.textContent = 'Aura übernommen. Gerät und Farbe wählen.';
      } else if (action === 'color') {
        output.textContent = 'Aura hat die Farbe bestätigt.';
      } else if (action === 'release') {
        code = '';
        select.replaceChildren();
        bass.checked = false;
        output.textContent = 'Aura freigegeben.';
      }
    } catch (error) {
      if (action === 'bass') bass.checked = false;
      output.textContent = error instanceof TypeError
        ? 'Aura-Dienst nicht erreichbar. Windows-Starter und Browserfreigabe prüfen.'
        : error.message;
    } finally {
      pending = null;
    }
  }

  get('acquire').addEventListener('click', () => {
    const session = input.value.trim();
    if (!/^[0-9a-f]{48}$/.test(session)) {
      output.textContent = 'Kopplungscode aus dem Windows-Starter eingeben.';
      return;
    }
    if (window.confirm('Aura übernehmen? Beim Freigeben setzt ASUS die Geräte auf den Standardeffekt zurück.')) {
      void command('acquire', undefined, session);
    }
  });
  select.addEventListener('change', () => void command('select', select.value));
  get('apply').addEventListener('click', () => void command('color', get('color').value.slice(1)));
  get('release').addEventListener('click', () => void command('release'));
  window.setInterval(() => {
    if (!code || !authorized() || !bass.checked || pending || document.hidden) return;
    const bus = window.__MeterBus;
    if (bus?.source !== 'real' || Date.now() - bus.ts > 1000 ||
      bus.ts === lastFrame || !Number.isFinite(bus.low) || bus.low < 0 || bus.low > 1) return;
    lastFrame = bus.ts;
    void command('bass', bus.low);
  }, 250);

  window.addEventListener('pagehide', release);

  function release() {
    const session = code;
    code = '';
    input.value = '';
    select.replaceChildren();
    bass.checked = false;
    if (session) {
      const previous = pending;
      void (async () => {
        try { await previous; } catch {}
        try { await request('release', undefined, session); }
        catch { output.textContent = 'Freigabe unbestätigt. Aura-Dienst oder Armoury Crate prüfen.'; }
      })();
    }
  }
  return release;
}
