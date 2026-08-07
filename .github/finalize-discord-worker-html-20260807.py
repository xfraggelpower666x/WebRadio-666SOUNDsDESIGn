from pathlib import Path
import re

html_paths = [
    Path('index.html'), Path('public/index.html'),
    Path('VELUNA/index.html'), Path('veluna/index.html'),
    Path('public/VELUNA/index.html'), Path('public/veluna/index.html')
]

transport_direct = re.compile(r"transport\s*:\s*(['\"])direct\1")
transport_worker = re.compile(r"transport\s*:\s*(['\"])worker\1")

for path in html_paths:
    text = path.read_text(encoding='utf-8')
    matches = list(transport_direct.finditer(text))
    if len(matches) != 1:
        raise SystemExit(f'{path}: expected exactly one explicit direct transport, found {len(matches)}')
    text, count = transport_direct.subn(lambda m: f"transport:{m.group(1)}worker{m.group(1)}", text, count=1)
    if count != 1 or transport_direct.search(text):
        raise SystemExit(f'{path}: direct transport override remains')
    if not transport_worker.search(text):
        raise SystemExit(f'{path}: Worker transport override missing')
    path.write_text(text, encoding='utf-8')

if Path('index.html').read_bytes() != Path('public/index.html').read_bytes():
    raise SystemExit('root/public index mirror mismatch')
veluna = Path('VELUNA/index.html').read_bytes()
for path in [Path('veluna/index.html'), Path('public/VELUNA/index.html'), Path('public/veluna/index.html')]:
    if path.read_bytes() != veluna:
        raise SystemExit(f'VELUNA mirror mismatch: {path}')

test_path = Path('tests/direct-discord-runtime-owner-repair.test.mjs')
t = test_path.read_text(encoding='utf-8')
needle = "test('Canonical visualizer adopts or registers one central graph"
idx = t.index(needle)
new_test = r"""test('all production player mirrors explicitly select Worker transport', async () => {
  const files = ['index.html','public/index.html','VELUNA/index.html','veluna/index.html','public/VELUNA/index.html','public/veluna/index.html'];
  for (const path of files) {
    const html = await read(path);
    assert.match(html, /transport:\s*'worker'/, path);
    assert.doesNotMatch(html, /transport:\s*'direct'/, path);
    assert.match(html, /discord-player-addon-v3\.js\?v=2026-08-07-worker-restore-v1/, path);
  }
  assert.equal(await read('public/index.html'), await read('index.html'));
  const veluna = await read('VELUNA/index.html');
  for (const path of ['veluna/index.html','public/VELUNA/index.html','public/veluna/index.html']) assert.equal(await read(path), veluna, path);
});

"""
test_path.write_text(t[:idx] + new_test + t[idx:], encoding='utf-8')
