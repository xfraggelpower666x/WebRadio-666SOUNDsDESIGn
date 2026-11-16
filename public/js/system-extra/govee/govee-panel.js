import { GOVEE_SYNC_CONFIG } from './govee-sync-config.js';
import { goveeTestOn, goveeTestOff, goveeTestColor } from './govee-bridge-client.js';
import { bootFromCanonicalMeterBus } from './govee-scene-sync.js';

const button = document.getElementById('statusGovee');
const panel = document.getElementById('web-govee');
const auth = window.S666AdminAuth;
const { sync } = bootFromCanonicalMeterBus();
const status = panel.querySelector('[role=status]');
const checkbox = panel.querySelector('input[type=checkbox]');
let session;
let checking = false;
let pending = Promise.resolve();
let expiry;
let opening = false;

function authorized() {
  return panel.open && session && session === auth?.getToken();
}

function endSession() {
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
    status.textContent = 'Freigabe aktiv. Die lokale Govee-Bridge muss laufen.';
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

function command(work, failed) {
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
    await work();
    if (active === session) status.textContent = 'Lokale Bridge hat den Befehl angenommen.';
  }).catch(() => {
    failed?.();
    if (active === session) status.textContent = 'Lokale Govee-Bridge nicht erreichbar oder Befehl abgelehnt.';
  }).finally(() => { checking = false; });
}

checkbox.addEventListener('change', () => {
  const enable = checkbox.checked;
  if (checking || !authorized()) {
    checkbox.checked = GOVEE_SYNC_CONFIG.enabled;
    return;
  }
  command(() => sync.setEnabled(enable), () => { checkbox.checked = false; });
});
panel.querySelector('select').addEventListener('change', event => {
  const mode = event.target.value;
  command(() => sync.setMode(mode));
});
panel.querySelector('[data-action=on]').addEventListener('click', () => command(goveeTestOn));
panel.querySelector('[data-action=off]').addEventListener('click', () => command(goveeTestOff));
panel.querySelector('[data-action=color]').addEventListener('click', () => {
  const value = panel.querySelector('input[type=color]').value;
  const [r,g,b] = value.slice(1).match(/../g).map(part => parseInt(part, 16));
  const brightness = Number(panel.querySelector('input[type=range]').value);
  command(() => goveeTestColor({ r,g,b,brightness }));
});
