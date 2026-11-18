import { bindAuraControls } from './asus-aura-web.js?v=signal-r1';
import { GOVEE_SYNC_CONFIG } from './govee-sync-config.js';
import { checkGoveeArea, goveeCloudPower, goveeCloudTestColor } from './govee-cloud-client.js?v=cloud-restore-1';
import { bootFromCanonicalMeterBus } from './govee-scene-sync.js?v=signal-r1';

const button = document.getElementById('statusGovee');
const panel = document.getElementById('web-govee');
const auth = window.S666AdminAuth;
const { sync } = bootFromCanonicalMeterBus();
const status = panel.querySelector(':scope > [role=status]');
const checkbox = panel.querySelector('fieldset input[type=checkbox]');
const areaSelect = panel.querySelector('[data-area]');
const iosOption = panel.querySelector('[data-govee-ios]');
const iosCheckbox = iosOption.querySelector('input');
iosOption.hidden = !window.S666AudioMeterPolicy?.isAppleMobile;
iosCheckbox.addEventListener('change', () => sync.allowSynthetic(!!authorized() && iosCheckbox.checked));
let area = areaSelect.value;
let session;
let checking = false;
let pending = Promise.resolve();
let expiry;
let opening = false;

function authorized() {
  return panel.open && session && session === auth?.getToken();
}

const releaseAura = bindAuraControls(panel, authorized);

function endSession() {
  releaseAura();
  sync.allowSynthetic(false);
  iosCheckbox.checked = false;
  clearTimeout(expiry);
  session = null;
  checkbox.checked = false;
  pending = pending.then(async () => {
    if (GOVEE_SYNC_CONFIG.enabled) await sync.setEnabled(false).catch(() => {});
    checkbox.checked = false;
  });
}

button.addEventListener('click', async () => {
  if (opening || panel.open || !auth) return;
  opening = true;
  try {
    const gate = await auth.ensure({ forceLogin: true, message: 'Admin-Passwort für die Govee Lichtsteuerung' });
    if (gate.ok !== true || gate.authOk !== true || gate.pwOk !== true || !auth.getToken()) return;
    await pending;
    session = auth.getToken();
    status.textContent = 'Admin-Freigabe aktiv. Geräte können über die Govee-Cloud geprüft werden.';
    panel.showModal();
    expiry = setTimeout(() => panel.close(), 300000);
  } catch (error) {
    if (error?.message !== 'login_cancelled') {
      button.setAttribute('title', 'GOV · Admin-Freigabe fehlgeschlagen');
    }
  } finally {
    opening = false;
  }
});
panel.querySelector('[data-close]').addEventListener('click', () => panel.close());
panel.addEventListener('close', endSession);
document.addEventListener('s666:admin-auth-state', () => {
  if (panel.open && !authorized()) panel.close();
});

function command(work, failed, confirmsConnection = true) {
  if (!authorized() || checking) return;
  checking = true;
  const active = session;
  pending = pending.then(async () => {
    if (!authorized() || active !== session) return;
    const gate = await auth.check(true);
    if (!authorized() || active !== session) return;
    if (gate.ok !== true || gate.authOk !== true || gate.pwOk !== true) {
      panel.close();
      return;
    }
    const message = await work();
    if (active === session) {
      status.textContent = typeof message === 'string' ? message : 'Govee-Cloud hat den Befehl bestätigt.';
      if (confirmsConnection) {
        window.dispatchEvent(new CustomEvent('s666:govee-state', { detail: { state: 'online', error: '' } }));
      }
    }
  }).catch(error => {
    failed?.();
    const messages = {
      govee_service_unconfigured: 'Die Verbindung zum Govee-Worker fehlt.',
      govee_service_unavailable: 'Der Govee-Worker ist nicht erreichbar.',
      govee_no_devices: 'Keine Geräte für den gewählten Bereich gefunden.',
      govee_capability_unavailable: 'Die Geräte im gewählten Bereich unterstützen diese Funktion nicht.',
      govee_rate_limit: 'Govee begrenzt die Anfragen. Bitte kurz warten.',
      govee_partial: 'Govee hat den Befehl nur für einen Teil der Geräte bestätigt.'
    };
    if (active === session) {
      status.textContent = messages[error?.message] || 'Govee-Cloud-Anfrage fehlgeschlagen.';
      window.dispatchEvent(new CustomEvent('s666:govee-state', { detail: { state: 'offline', error: status.textContent } }));
    }
  }).finally(() => { checking = false; });
}

checkbox.addEventListener('change', () => {
  const enable = checkbox.checked;
  if (checking || !authorized()) {
    checkbox.checked = GOVEE_SYNC_CONFIG.enabled;
    return;
  }
  command(async () => {
    await sync.setEnabled(enable);
    return enable ? 'Cloud-Audio-Reaktivität aktiv.' : 'Cloud-Audio-Reaktivität aus.';
  }, () => { checkbox.checked = false; }, enable);
});
panel.querySelector('[data-mode]').addEventListener('change', event => {
  if (!authorized()) return;
  const mode = event.target.value;
  sync.setMode(mode);
  status.textContent = 'Modus für die Cloud-Audio-Reaktivität gewählt.';
});
areaSelect.addEventListener('change', () => {
  const next = areaSelect.value;
  areaSelect.value = area;
  command(async () => {
    await sync.setArea(next);
    area = next;
    areaSelect.value = next;
    return 'Gerätebereich verbunden.';
  });
});
panel.querySelector('[data-action=devices]').addEventListener('click', () => {
  command(async () => `${await checkGoveeArea(area)} Gerät(e) im gewählten Bereich gefunden.`);
});
panel.querySelector('[data-action=on]').addEventListener('click', () => command(() => goveeCloudPower(area, true)));
panel.querySelector('[data-action=off]').addEventListener('click', () => command(() => goveeCloudPower(area, false)));
panel.querySelector('[data-action=color]').addEventListener('click', () => {
  const value = panel.querySelector('input[type=color]').value;
  const [r,g,b] = value.slice(1).match(/../g).map(part => parseInt(part, 16));
  const brightness = Number(panel.querySelector('input[type=range]').value);
  command(() => goveeCloudTestColor(area, { r, g, b, brightness }));
});
