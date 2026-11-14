import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/deploy-cloudflare-workers.yml', import.meta.url), 'utf8');

test('production deploy fails closed before Worker deploys when AutoDJ secret is absent', () => {
  assert.match(workflow, /name: Verify required AutoDJ production secret binding/);
  assert.match(workflow, /S666_AUTODJ_SKIP_ACCESS_TOKEN: \$\{\{ secrets\.S666_AUTODJ_SKIP_ACCESS_TOKEN \}\}/);
  assert.match(workflow, /if \[\[ -z "\$\{S666_AUTODJ_SKIP_ACCESS_TOKEN:-\}" \]\]/);
  assert.match(workflow, /needs: verify/);
  const verifyIndex = workflow.indexOf('Verify required AutoDJ production secret binding');
  const passwordDeployIndex = workflow.indexOf('deploy-password-worker:');
  assert.ok(verifyIndex > -1 && passwordDeployIndex > verifyIndex);
});

test('main Worker deploys before updating the AutoDJ access token secret', () => {
  const mainDeployIndex = workflow.indexOf('deploy-webradio-worker:');
  assert.ok(mainDeployIndex > -1);
  const mainDeploy = workflow.slice(mainDeployIndex);
  const deployIndex = mainDeploy.indexOf('name: Deploy WebRadio Worker');
  const secretIndex = mainDeploy.indexOf('name: Update AutoDJ production secret');
  assert.ok(deployIndex > -1 && secretIndex > deployIndex);
  const deployStep = mainDeploy.slice(deployIndex, secretIndex);
  const secretStep = mainDeploy.slice(secretIndex);
  assert.match(deployStep, /uses: cloudflare\/wrangler-action@v3/);
  assert.match(deployStep, /wranglerVersion: "4\.111\.0"/);
  assert.match(deployStep, /command: deploy/);
  assert.doesNotMatch(deployStep, /secrets:/);
  assert.match(secretStep, /printf '%s' "\$S666_AUTODJ_SKIP_ACCESS_TOKEN" \|\s*npx --yes wrangler@4\.111\.0 secret put S666_AUTODJ_SKIP_ACCESS_TOKEN/);
  assert.match(secretStep, /env:\s*\n\s*S666_AUTODJ_SKIP_ACCESS_TOKEN: \$\{\{ secrets\.S666_AUTODJ_SKIP_ACCESS_TOKEN \}\}/);
});

test('workflow never contains an AutoDJ access-token literal', () => {
  const secretReference = '${{ secrets.S666_AUTODJ_SKIP_ACCESS_TOKEN }}';
  const yamlEnvLines = workflow
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('S666_AUTODJ_SKIP_ACCESS_TOKEN: '));

  assert.equal(yamlEnvLines.length, 2);
  for (const line of yamlEnvLines) {
    assert.equal(line, `S666_AUTODJ_SKIP_ACCESS_TOKEN: ${secretReference}`);
  }
});
