from pathlib import Path

ROOT = Path('.')
CANONICAL = ROOT / 'js/addons/discord-player-addon-v3.js'
MIRROR = ROOT / 'public/js/addons/discord-player-addon-v3.js'

text = CANONICAL.read_text(encoding='utf-8')
marker = "  async function postJson(path, payload) {"
bridge = """  /*
   * Shared protected-action contract.
   * Discord webhook sends intentionally remain public same-origin requests;
   * these helpers are reserved for protected admin actions only.
   */
  function ensureInteractiveAuth(message) {
    if (!window.S666AdminAuth || typeof window.S666AdminAuth.ensure !== 'function') {
      return Promise.reject(new Error('admin_auth_client_missing'));
    }
    return window.S666AdminAuth.ensure({ message: message || 'Admin-Passwort eingeben:' });
  }

  function authorizedAdminFetch(path, init) {
    if (!window.S666AdminAuth || typeof window.S666AdminAuth.fetch !== 'function') {
      return Promise.reject(new Error('admin_auth_client_missing'));
    }
    return window.S666AdminAuth.fetch(path, init);
  }

"""

if 'function ensureInteractiveAuth(' not in text:
    if text.count(marker) != 1:
        raise SystemExit(f'postJson marker count={text.count(marker)}')
    text = text.replace(marker, bridge + marker, 1)

if 'S666AdminAuth.fetch' not in text:
    raise SystemExit('authorized admin fetch contract missing')

CANONICAL.write_text(text, encoding='utf-8')
MIRROR.write_text(text, encoding='utf-8')
print('protected auth contract bridge applied; Discord remains no-auth')
