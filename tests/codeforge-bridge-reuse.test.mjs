import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const registry = JSON.parse(read('radio-codeforge/bridge/BRIDGE_REGISTRY.json'));
const contract = read(registry.canonical_contract);
const core = read('666STREAM_STRUCTURE_CONTROL/continuity/LIVE_CIRCLE.md');
const session = read('666STREAM_STRUCTURE_CONTROL/current/SESSION_GOVERNOR.md');
const config = JSON.parse(read('radio-codeforge/radio-codeforge.config.json'));

test('CodeForge reuses one canonical bridge instead of rebuilding per job', () => {
  assert.equal(registry.bridge_id, '666STREAM-CODEFORGE-ARTIFACT-BRIDGE');
  assert.equal(registry.owner, config.systemId);
  assert.equal(registry.reuse_before_build, true);
  assert.equal(registry.new_bridge_per_task, false);
  assert.equal(registry.new_bridge_per_project, false);
  assert.equal(registry.new_bridge_per_filetype, false);
  assert.equal(registry.repair_existing_first, true);
  assert.match(contract, /NEW_BRIDGE_PER_TASK=FORBIDDEN/);
  assert.match(core, /BRIDGE_REUSE_BEFORE_BUILD=REQUIRED/);
  assert.match(session, /BRIDGE_REGISTRY.json/);
});

test('bridge retains native, transport and release safety boundaries', () => {
  assert.equal(registry.transport_status, 'PREPARED_NOT_LIVE_TESTED');
  assert.equal(registry.host_execution, 'READBACK_PENDING');
  assert.equal(registry.remote_readback, 'READBACK_PENDING');
  assert.equal(registry.mutation_authority, false);
  assert.equal(registry.foreign_authority, false);
  assert.equal(registry.production_runtime_integration, false);
  assert.equal(registry.explicit_push_approval_required, true);
  assert.equal(registry.head_recheck_required, true);
  assert.equal(registry.force_push_forbidden, true);
  assert.equal(config.runtimeIntegration, false);
});

test('LYVRA 1.0 is a transport reference, not foreign authority', () => {
  assert.equal(registry.reference_model.version, '1.0.0');
  assert.equal(registry.reference_model.system, 'LYVRA');
  assert.equal(registry.reference_model.no_identity_import, true);
  assert.equal(registry.binary_transport_policy.preferred, 'DIRECT_BINARY_REPOSITORY_MIRROR');
  assert.equal(registry.binary_transport_policy.fallback_only_when_direct_blocked, true);
  assert.equal(registry.binary_transport_policy.requires_expected_sha256, true);
  assert.equal(registry.binary_transport_policy.requires_independent_remote_byte_identity, true);
  assert.equal(registry.binary_transport_policy.release_promotion_by_native_update_only, true);
  assert.equal(registry.owner, config.systemId);
});

test('LYVRA local fallback is reusable and CLIC stays disabled until exact source verification', () => {
  const chain = registry.offline_fallback_chain_20261017;
  assert.equal(chain.bridge_id, registry.bridge_id);
  assert.equal(chain.implementation_count, 1);
  assert.equal(chain.no_new_bridge, true);
  assert.equal(chain.lyvra_offline.status, 'PROCEDURE_SOURCE_VERIFIED_EXECUTION_NOT_TESTED');
  assert.ok(chain.lyvra_offline.required.includes('source_size_and_sha256'));
  assert.equal(chain.clic_offline.status, 'REFERENCE_NOT_VERIFIED_DISABLED');
  assert.equal(chain.clic_offline.no_invented_tooling, true);
  assert.equal(chain.offline_execution, 'NOT_TESTED');
  assert.equal(chain.automatic_foreign_dispatch, false);
});

test('666STREAM master reference stays native, versioned and peer-adoption gated', () => {
  const master = registry.master_reference;
  assert.equal(master.id, '666STREAM-CODEFORGE-BRIDGE-MASTER');
  assert.equal(master.version, '1.0.0');
  assert.equal(master.owner, '666STREAM_STRUCTURE_CONTROL');
  assert.equal(master.status, 'CANONICAL_666STREAM_MASTER_REFERENCE');
  assert.equal(master.other_systems_adoption, 'PROPOSAL_ONLY');
  assert.equal(master.no_foreign_auto_adoption, true);
  assert.equal(master.source_provenance.clic_original, 'NOT_VERIFIED');
  assert.equal(master.offline_runner, 'NOT_TESTED');
  const source = read(master.source);
  assert.match(source, /DIRECT_582_BYTE_ISOLATED_ZIP=PASS/);
  assert.match(source, /WINDOWS_POWERSHELL_RUNNER=NOT_TESTED/);
  assert.match(source, /CLIC_NATIVE_OFFLINE_ORIGINAL=NOT_VERIFIED/);
  assert.match(read(master.peer_handoffs.LYVRA), /PROPOSAL_ONLY_NOT_DELIVERED_NOT_ADOPTED/);
  assert.match(read(master.peer_handoffs.CLIC), /PROPOSAL_ONLY_NOT_DELIVERED_NOT_ADOPTED/);
});
