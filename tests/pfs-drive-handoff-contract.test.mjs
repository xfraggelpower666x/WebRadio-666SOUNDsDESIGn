import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/666pfs-child-freeze.yml', 'utf8');
const uploader = readFileSync('scripts/pfs-drive-upload.py', 'utf8');

test('666PFS child freeze hands verified production repo to canonical Drive child', () => {
  assert.match(workflow, /PFS_DRIVE_FOLDER_ID:\s*1lLn_9SielBmxVEJ5WQE7X6554ZIbsc56/);
  assert.match(workflow, /PFS_GDRIVE_SERVICE_ACCOUNT_JSON:\s*\$\{\{ secrets\.PFS_GDRIVE_SERVICE_ACCOUNT_JSON \}\}/);
  assert.match(workflow, /python scripts\/pfs-drive-upload\.py/);
  assert.match(workflow, /PFS_DRIVE_DESTINATION=666PFS\/Child_Systems\/666STREAM_DEPLOYMENT/);
  assert.match(workflow, /PFS_DRIVE_HANDOFF=PASS/);
});

test('Drive uploader preserves immutable commit copy and rolling current copy', () => {
  assert.match(uploader, /666SOUNDsDESIGn_PRODUCTION_\{source_commit\}_PFS_CHILD_COPY\.zip/);
  assert.match(uploader, /CURRENT_666STREAM_PRODUCTION_REPOSITORY\.zip/);
  assert.match(uploader, /CURRENT_666STREAM_DEPLOYMENT\.json/);
  assert.match(uploader, /archive SHA mismatch/);
  assert.match(uploader, /POST_DEPLOY_VERIFIED_TREE/);
});

test('Drive handoff is production-only in workflow', () => {
  const transferStep = workflow.match(/- name: Transfer verified repository copy[\s\S]*?run: python scripts\/pfs-drive-upload\.py/);
  assert.ok(transferStep, 'transfer step missing');
  assert.match(transferStep[0], /if: github\.event_name == 'workflow_run'/);
});
