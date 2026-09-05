import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/666pfs-child-freeze.yml', 'utf8');
const packager = readFileSync('scripts/pfs-child-handoff-package.py', 'utf8');

test('666PFS child freeze prepares a PFS-owned handoff package', () => {
  assert.match(workflow, /PFS_CHILD_TARGET:\s*666PFS\/Child_Systems\/666STREAM_DEPLOYMENT/);
  assert.match(workflow, /python scripts\/pfs-child-handoff-package\.py/);
  assert.match(workflow, /PFS_HANDOFF_PACKAGE=READY/);
  assert.match(workflow, /PFS_STORAGE_OWNER=666PFS/);
  assert.match(workflow, /RADIO_DRIVE_CREDENTIALS=NOT_REQUIRED/);
  assert.doesNotMatch(workflow, /PFS_GDRIVE_SERVICE_ACCOUNT_JSON/);
  assert.doesNotMatch(workflow, /google-api-python-client/);
});

test('handoff package preserves verified repository evidence for PFS intake', () => {
  assert.match(packager, /666pfs-child-handoff-package-v1/);
  assert.match(packager, /READY_FOR_PFS_INTAKE/);
  assert.match(packager, /repositoryArchiveSha256/);
  assert.match(packager, /store immutable repository copy/);
  assert.match(packager, /update current repository copy/);
  assert.match(packager, /update current pointer/);
  assert.match(packager, /register child backup/);
  assert.match(packager, /archive SHA mismatch/);
  assert.match(packager, /handoff ZIP CRC failure/);
});

test('radio repo does not own Google Drive credentials or final PFS storage', () => {
  assert.doesNotMatch(workflow, /PFS_DRIVE_FOLDER_ID/);
  assert.doesNotMatch(packager, /google\.oauth2|googleapiclient|service_account/);
  assert.match(packager, /radioDriveCredentialsRequired\": False/);
  assert.match(packager, /storageOwner\": \"666PFS\"/);
});
