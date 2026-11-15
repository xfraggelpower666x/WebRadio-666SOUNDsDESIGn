import { goveeDevices, goveeState, goveeControl } from './govee-bridge-client.js?v=govee-cloud-r02';
import { createSceneSender, describeScene, fillScenes } from './govee-light-scenes.js?v=light-scenes-r01';
import { GOVEE_SYNC_CONFIG } from './govee-sync-config.js?v=govee-cloud-r02';

const byId = id => document.getElementById(id);
const chip = byId('statusGovee');
const dialog = byId('playerGoveeDialog');
const output = byId('playerGoveeStatus');
const scene = byId('playerGoveeScene');
const fx = byId('goveeEnableSync');
const area = byId('goveeModeSelect');
const list = dialog.querySelector('[data-gov-devices]');
const controls = [...dialog.querySelectorAll('[data-gov], #goveeEnableSync, #goveeModeSelect')];
const sender = createSceneSender(goveeControl);
let devices = [];
let busy = false;
let authenticating = false;

fillScenes(scene);
function syncFx() {
  fx.checked = GOVEE_SYNC_CONFIG.enabled;
  area.value = GOVEE_SYNC_CONFIG.area;
}

async function run(action) {
  if (busy) return;
  busy = true;
  controls.forEach(control => { control.disabled = true; });
  try { output.textContent = await action(); }
  catch (error) { output.textContent = error.message; }
  finally {
    syncFx();
    controls.forEach(control => { control.disabled = false; });
    busy = false;
  }
}

chip.addEventListener('click', async () => {
  if (authenticating || dialog.open || !window.S666AdminAuth) return;
  authenticating = true;
  try {
    await window.S666AdminAuth.ensure({ forceLogin: true, message: 'Admin-Passwort für die Lichtsteuerung eingeben:' });
    syncFx();
    dialog.showModal();
  } catch (error) {
    if (error.message !== 'login_cancelled') {
      chip.title = window.S666AdminAuth.errorMessage?.(error.message) || error.message;
    }
  } finally { authenticating = false; }
});
dialog.addEventListener('close', () => chip.focus());
window.addEventListener('s666:govee-state', syncFx);

fx.addEventListener('change', () => {
  const enabled = fx.checked;
  void run(async () => {
    const sync = window.S666GoveeSync;
    if (!sync) throw new Error('Audio-Synchronisation ist noch nicht bereit.');
    await sync.setEnabled(enabled);
    return enabled ? 'Audio-Synchronisation aktiv.' : 'Audio-Synchronisation aus.';
  });
});
area.addEventListener('change', () => {
  const sync = window.S666GoveeSync;
  if (sync) sync.setMode(area.value);
  syncFx();
});

const color = 'devices.capabilities.color_setting';
const number = id => {
  const input = byId(id);
  if (!input.value || !input.checkValidity()) throw new Error('Bitte einen gültigen Wert eingeben.');
  return input.valueAsNumber;
};
const capabilities = {
  on: () => ({ type: 'devices.capabilities.on_off', instance: 'powerSwitch', value: 1 }),
  off: () => ({ type: 'devices.capabilities.on_off', instance: 'powerSwitch', value: 0 }),
  color: () => ({ type: color, instance: 'colorRgb', value: Number.parseInt(byId('playerGoveeColor').value.slice(1), 16) }),
  brightness: () => ({ type: 'devices.capabilities.range', instance: 'brightness', value: number('playerGoveeBrightness') }),
  kelvin: () => ({ type: color, instance: 'colorTemperatureK', value: number('playerGoveeKelvin') })
};
dialog.querySelectorAll('[data-gov]').forEach(button => button.addEventListener('click', () => run(async () => {
  const action = button.dataset.gov;
  if (action === 'load') {
    ({ devices } = await goveeDevices());
    list.replaceChildren(...devices.map((device, index) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = String(index);
      label.append(input, ' ' + (device.deviceName || device.sku));
      return label;
    }));
    sender.reset();
    return devices.length + ' Geräte gefunden.';
  }
  const selected = [...list.querySelectorAll('input:checked')].map(input => devices[Number(input.value)]);
  if (!selected.length || selected.length > 8) throw new Error('Bitte 1 bis 8 Geräte auswählen.');
  if (action === 'state') {
    const results = await Promise.allSettled(selected.map(goveeState));
    return results.map((result, index) => {
      const device = selected[index];
      return (device.deviceName || device.sku) + ': ' + (result.status === 'fulfilled'
        ? JSON.stringify(result.value.result ?? result.value)
        : result.reason.message);
    }).join('\n');
  }
  if (action === 'scene') return describeScene(await sender.apply(selected, scene.value));
  const capability = capabilities[action]();
  if (selected.some(device => !device.capabilities?.some(item => item.type === capability.type && item.instance === capability.instance))) {
    throw new Error('Mindestens ein ausgewähltes Gerät unterstützt diese Funktion nicht.');
  }
  sender.reset();
  const result = await goveeControl(selected, capability);
  return describeScene({ ...result, targeted: selected });
})));
