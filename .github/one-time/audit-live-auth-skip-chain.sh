#!/usr/bin/env bash
set -euo pipefail
base='https://webradio.666soundsdesign-broadcaster.com'
origin='https://webradio.666soundsdesign-broadcaster.com'
stamp="$(date +%s)"

curl --fail --silent --show-error --location "https://666-system-pw.666soundsdesign-broadcaster.com/health?t=$stamp" -o /tmp/pw.json
curl --fail --silent --show-error --location "https://666-system-auth.666soundsdesign-broadcaster.com/health?t=$stamp" -o /tmp/auth.json

args=(--silent --show-error --location -o /tmp/live.json -w '%{http_code}')
if [[ -n "${DEBUG_TOKEN:-}" ]]; then args+=( -H "x-debug-token: ${DEBUG_TOKEN}" ); fi
curl "${args[@]}" "$base/api/admin/auth-live-state?t=$stamp" > /tmp/live-code.txt

curl --silent --show-error --location \
  -H 'content-type: application/json' -H 'accept: application/json' \
  -H "origin: $origin" -H "referer: $origin/veluna" -H 'sec-fetch-site: same-origin' \
  -X POST "$base/api/admin/login?t=$stamp" \
  --data '{"password":"__S666_INTENTIONAL_INVALID_AUDIT_PASSWORD__"}' \
  -o /tmp/login.json -w '%{http_code}' > /tmp/login-code.txt

curl --silent --show-error --location \
  -H 'content-type: application/json' -H 'accept: application/json' \
  -H "origin: $origin" -H "referer: $origin/veluna" -H 'sec-fetch-site: same-origin' \
  -X POST "$base/api/admin/skip?t=$stamp" \
  --data '{"source":"live-auth-audit-no-token"}' \
  -o /tmp/skip.json -w '%{http_code}' > /tmp/skip-code.txt

python - <<'PY'
import json
from pathlib import Path
pw=json.loads(Path('/tmp/pw.json').read_text())
auth=json.loads(Path('/tmp/auth.json').read_text())
live=json.loads(Path('/tmp/live.json').read_text())
login=json.loads(Path('/tmp/login.json').read_text())
skip=json.loads(Path('/tmp/skip.json').read_text())
print('pwWorkerReachable='+str(pw.get('ok') is True).lower())
print('pwWorkerVersion='+str(pw.get('version')))
print('authWorkerReachable='+str(auth.get('ok') is True).lower())
print('authWorkerVersion='+str(auth.get('version')))
print('authLiveStateHttp='+Path('/tmp/live-code.txt').read_text().strip())
for key in ('mainWorkerCanReachPwLogin','mainWorkerCanReachAuthVerify','audienceConfigured','serviceTokenConfigured','pwWorkerVersion','authWorkerVersion'):
    print(f'{key}={live.get(key)}')
print('invalidLoginHttp='+Path('/tmp/login-code.txt').read_text().strip())
print('invalidLoginError='+str(login.get('error')))
print('skipNoTokenHttp='+Path('/tmp/skip-code.txt').read_text().strip())
print('skipNoTokenError='+str(skip.get('error')))
assert pw.get('ok') is True
assert auth.get('ok') is True
assert login.get('ok') is False
assert skip.get('ok') is False
assert skip.get('error') in {'auth_token_missing','unauthorized'}
print('LIVE_AUTH_SKIP_CHAIN_DIAGNOSTICS_COMPLETE')
PY
