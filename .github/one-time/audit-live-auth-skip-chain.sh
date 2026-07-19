#!/usr/bin/env bash
set -euo pipefail
base='https://webradio.666soundsdesign-broadcaster.com'
origin='https://webradio.666soundsdesign-broadcaster.com'

# Give the production Worker deployment and edge cache time to converge.
sleep 75
stamp="$(date +%s)"

curl --fail --silent --show-error --location "https://666-system-pw.666soundsdesign-broadcaster.com/health?t=$stamp" -o /tmp/pw.json
curl --fail --silent --show-error --location "https://666-system-auth.666soundsdesign-broadcaster.com/health?t=$stamp" -o /tmp/auth.json

args=(--silent --show-error --location -o /tmp/live.json -w '%{http_code}')
if [[ -n "${DEBUG_TOKEN:-}" ]]; then args+=( -H "x-debug-token: ${DEBUG_TOKEN}" ); fi
curl "${args[@]}" "$base/api/admin/auth-live-state?t=$stamp" > /tmp/live-code.txt

# An intentional invalid password must reach a real PW worker. A definitive rejection
# or throttling response proves the proxy path; transport/config failures do not.
curl --silent --show-error --location \
  -H 'content-type: application/json' -H 'accept: application/json' \
  -H "origin: $origin" -H "referer: $origin/veluna" -H 'sec-fetch-site: same-origin' \
  -X POST "$base/api/admin/login?t=$stamp" \
  --data '{"password":"__S666_INTENTIONAL_INVALID_AUDIT_PASSWORD__"}' \
  -o /tmp/login.json -w '%{http_code}' > /tmp/login-code.txt

# A deliberately malformed bearer token must reach a real Auth worker and be rejected
# as malformed/signature-invalid, never as unreachable or service-auth broken.
curl --silent --show-error --location \
  -H 'accept: application/json' -H 'authorization: Bearer invalid.audit.token' \
  -H "origin: $origin" -H "referer: $origin/veluna" -H 'sec-fetch-site: same-origin' \
  "$base/api/admin/auth-check?t=$stamp" \
  -o /tmp/auth-check.json -w '%{http_code}' > /tmp/auth-check-code.txt

# No-token Skip request must remain blocked and must not perform a skip.
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
auth_check=json.loads(Path('/tmp/auth-check.json').read_text())
skip=json.loads(Path('/tmp/skip.json').read_text())

login_error=str(login.get('error'))
auth_error=str(auth_check.get('error'))
skip_error=str(skip.get('error'))

print('pwWorkerReachable='+str(pw.get('ok') is True).lower())
print('pwWorkerVersion='+str(pw.get('version')))
print('authWorkerReachable='+str(auth.get('ok') is True).lower())
print('authWorkerVersion='+str(auth.get('version')))
print('authLiveStateHttp='+Path('/tmp/live-code.txt').read_text().strip())
for key in ('mainWorkerCanReachPwLogin','mainWorkerCanReachAuthVerify','audienceConfigured','serviceTokenConfigured','pwWorkerVersion','authWorkerVersion'):
    print(f'{key}={live.get(key)}')
print('invalidLoginHttp='+Path('/tmp/login-code.txt').read_text().strip())
print('invalidLoginError='+login_error)
print('invalidAuthCheckHttp='+Path('/tmp/auth-check-code.txt').read_text().strip())
print('invalidAuthCheckError='+auth_error)
print('skipNoTokenHttp='+Path('/tmp/skip-code.txt').read_text().strip())
print('skipNoTokenError='+skip_error)

assert pw.get('ok') is True, pw
assert auth.get('ok') is True, auth
assert login.get('ok') is False, login
assert login_error in {'password_rejected','login_rate_limited'}, login
assert auth_check.get('ok') is False, auth_check
assert auth_error in {'token_malformed','token_signature_invalid','token_payload_invalid','token_missing'}, auth_check
assert skip.get('ok') is False, skip
assert skip_error in {'auth_token_missing','unauthorized'}, skip
print('LIVE_CANONICAL_PW_AUTH_SKIP_CHAIN_OK')
PY
