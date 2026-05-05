// ############################################################
// # 666SOUNDsDESIGn — Discord Player Card Sender for iPhone
// # Created: 2026-05-05
// # Modified: 2026-05-05
// # Version: V1.0
// # Purpose: iPhone/Scriptable sender for Discord Embed + Player Button.
// # Change Summary:
// # - Sends through Cloudflare Worker endpoint when available.
// # - Can fall back to direct Discord webhook stored in iOS Keychain.
// # - No public frontend secret output.
// ############################################################

const DEFAULT_WORKER_ENDPOINT = 'https://webradio.666soundsdesign-broadcaster.com/api/discord/player-card';
const DEFAULT_PLAYER_URL = 'https://webradio.666soundsdesign-broadcaster.com';
const KEY_WORKER_ENDPOINT = '666_DISCORD_WORKER_ENDPOINT';
const KEY_ADMIN_TOKEN = '666_DISCORD_ADMIN_TOKEN';
const KEY_DIRECT_WEBHOOK = '666_DISCORD_WEBHOOK_DIRECT';

async function askText(title, message, placeholder, secure = false) {
  const a = new Alert();
  a.title = title;
  a.message = message;
  if (secure) a.addSecureTextField(placeholder);
  else a.addTextField(placeholder);
  a.addAction('Speichern');
  a.addCancelAction('Abbrechen');
  const idx = await a.present();
  if (idx === -1) throw new Error('Abgebrochen');
  return a.textFieldValue(0).trim();
}

async function chooseMode() {
  const a = new Alert();
  a.title = 'Discord Player Card';
  a.message = 'Empfohlen: Worker-Modus. Webhook bleibt dann geheim im Cloudflare Worker.';
  a.addAction('Worker-Modus senden');
  a.addAction('Direkt-Webhook senden');
  a.addAction('Einstellungen zurücksetzen');
  a.addCancelAction('Abbrechen');
  return await a.presentSheet();
}

function buildPayload() {
  return {
    playerUrl: DEFAULT_PLAYER_URL,
    title: '🎧 666SOUNDsDESIGn WebRadio',
    nowPlaying: 'Live Cyber Radio Player',
    source: 'Mainstream / Backstream',
    listeners: 'live',
    previewImage: 'https://webradio.666soundsdesign-broadcaster.com/assets/discord/discord-preview.svg',
    avatarUrl: 'https://webradio.666soundsdesign-broadcaster.com/assets/images/logo-neon.png'
  };
}

async function sendWorker() {
  let endpoint = Keychain.contains(KEY_WORKER_ENDPOINT) ? Keychain.get(KEY_WORKER_ENDPOINT) : DEFAULT_WORKER_ENDPOINT;
  if (!Keychain.contains(KEY_WORKER_ENDPOINT)) Keychain.set(KEY_WORKER_ENDPOINT, endpoint);

  let adminToken = Keychain.contains(KEY_ADMIN_TOKEN) ? Keychain.get(KEY_ADMIN_TOKEN) : '';
  const req = new Request(endpoint);
  req.method = 'POST';
  req.headers = { 'Content-Type': 'application/json' };
  if (adminToken) req.headers['x-admin-token'] = adminToken;
  req.body = JSON.stringify(buildPayload());

  try {
    const txt = await req.loadString();
    return { ok: req.response.statusCode >= 200 && req.response.statusCode < 300, status: req.response.statusCode, body: txt };
  } catch (e) {
    if (!adminToken) {
      const setToken = new Alert();
      setToken.title = 'Admin Token setzen?';
      setToken.message = 'Wenn dein Worker DISCORD_ADMIN_TOKEN nutzt, muss der gleiche Token hier in Scriptable gespeichert werden.';
      setToken.addAction('Token eingeben');
      setToken.addCancelAction('Ohne Token weiter');
      const choice = await setToken.present();
      if (choice !== -1) {
        adminToken = await askText('Admin Token', 'DISCORD_ADMIN_TOKEN einfügen.', 'Token', true);
        Keychain.set(KEY_ADMIN_TOKEN, adminToken);
        return await sendWorker();
      }
    }
    throw e;
  }
}

async function sendDirectWebhook() {
  let webhook = Keychain.contains(KEY_DIRECT_WEBHOOK) ? Keychain.get(KEY_DIRECT_WEBHOOK) : '';
  if (!webhook) {
    webhook = await askText('Discord Webhook URL', 'Nur als iPhone-Notfallmodus. Besser ist der Worker-Modus.', 'https://discord.com/api/webhooks/...', true);
    Keychain.set(KEY_DIRECT_WEBHOOK, webhook);
  }

  const payload = {
    username: '666SOUNDsDESIGn Radio',
    avatar_url: 'https://webradio.666soundsdesign-broadcaster.com/assets/images/logo-neon.png',
    embeds: [{
      title: '🎧 666SOUNDsDESIGn WebRadio',
      description: '**Now Playing:** Live Cyber Radio Player\n**Source:** Mainstream / Backstream\n**Listeners:** live\n\nCyber Radio System online.',
      url: DEFAULT_PLAYER_URL,
      color: 65535,
      image: { url: 'https://webradio.666soundsdesign-broadcaster.com/assets/discord/discord-preview.svg' },
      footer: { text: '666SOUNDsDESIGn • iPhone Direct Sender V1' },
      timestamp: new Date().toISOString()
    }],
    components: [{
      type: 1,
      components: [{ type: 2, style: 5, label: '▶️ Player öffnen', url: DEFAULT_PLAYER_URL }]
    }]
  };

  const sep = webhook.includes('?') ? '&' : '?';
  const req = new Request(`${webhook}${sep}with_components=true`);
  req.method = 'POST';
  req.headers = { 'Content-Type': 'application/json' };
  req.body = JSON.stringify(payload);
  const txt = await req.loadString();
  return { ok: req.response.statusCode >= 200 && req.response.statusCode < 300, status: req.response.statusCode, body: txt };
}

async function resetSettings() {
  [KEY_WORKER_ENDPOINT, KEY_ADMIN_TOKEN, KEY_DIRECT_WEBHOOK].forEach(k => { if (Keychain.contains(k)) Keychain.remove(k); });
  return { ok: true, status: 200, body: 'Scriptable Discord settings removed.' };
}

try {
  const mode = await chooseMode();
  let result;
  if (mode === 0) result = await sendWorker();
  else if (mode === 1) result = await sendDirectWebhook();
  else if (mode === 2) result = await resetSettings();
  else throw new Error('Abgebrochen');

  const done = new Alert();
  done.title = result.ok ? 'Discord gesendet' : 'Discord Fehler';
  done.message = `Status: ${result.status}\n${String(result.body || 'OK').slice(0, 900)}`;
  done.addAction('Fertig');
  await done.present();
} catch (e) {
  const err = new Alert();
  err.title = 'Fehler';
  err.message = String(e.message || e);
  err.addAction('OK');
  await err.present();
}
