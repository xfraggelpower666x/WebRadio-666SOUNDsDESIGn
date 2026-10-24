import test from 'node:test';
import assert from 'node:assert/strict';
import {BOUNDARY,classifyEvidence,evaluateHandoff,forgeDecision} from './lyvra-supercodeforge-peer-adapter.mjs';

test('boundary preserves STREAM ownership and denies foreign authority',()=>{
  assert.equal(BOUNDARY.owner,'666STREAM_STRUCTURE_CONTROL');
  assert.equal(BOUNDARY.foreign_writes,false);
  assert.equal(BOUNDARY.foreign_activation,false);
});

test('evidence cannot jump source -> host',()=>{
  assert.equal(classifyEvidence({host_runtime_verified:true}).status,'DENIED');
  assert.equal(classifyEvidence({source_readback:true}).status,'SOURCE_VERIFIED');
  assert.equal(classifyEvidence({source_readback:true,ci_run_verified:true}).status,'CI_VERIFIED');
  assert.equal(classifyEvidence({source_readback:true,ci_run_verified:true,host_runtime_verified:true}).status,'HOST_VERIFIED');
});

test('foreign write is denied',()=>{
  assert.equal(classifyEvidence({foreign_write:true}).code,'FOREIGN_AUTHORITY_DENIED');
});

test('handoff requires immutable read-only peer reference and replay protection',()=>{
  const e={owner:'666STREAM_STRUCTURE_CONTROL',receiver:'666-RADIO-CODEFORGE-001',permission:'READ_ONLY_PEER_REFERENCE',mutation:false,source_commit:'a'.repeat(40),source_blob:'b'.repeat(40),replay_key:'peer-0001'};
  assert.equal(evaluateHandoff(e,[]).status,'ELIGIBLE_READ_ONLY_PEER_REFERENCE');
  assert.equal(evaluateHandoff(e,[{replay_key:'peer-0001'}]).code,'REPLAY_DENIED');
});

test('three checks moves to reversible learning-by-doing only when local authority is valid',()=>{
  assert.equal(forgeDecision({hypothesis_checks:3,current_authority_verified:true,reversible_action_available:true,demonstrated_defect:true,evidence:{source_readback:true}}).status,'LEARNING_BY_DOING');
  assert.equal(forgeDecision({hypothesis_checks:3,current_authority_verified:false,reversible_action_available:true,demonstrated_defect:true}).code,'CURRENT_AUTHORITY_REQUIRED');
});

test('no demonstrated defect means no write',()=>{
  assert.equal(forgeDecision({current_authority_verified:true,demonstrated_defect:false}).status,'NO_WRITE');
});
