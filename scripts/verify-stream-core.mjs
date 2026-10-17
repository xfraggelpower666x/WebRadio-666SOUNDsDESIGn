#!/usr/bin/env node
// Verifies 666STREAM native CORE contracts; never touches production or external systems.
import {readFileSync, existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {reconcileObligations, resolveSkill, dashboardProjection, OWNER} from '../666STREAM_STRUCTURE_CONTROL/runtime/core-intelligence.mjs';
const root='666STREAM_STRUCTURE_CONTROL/';
const json=path=>JSON.parse(readFileSync(root+path,'utf8'));
const manifest=json('REHYDRATION_MANIFEST.json');
const map=json('current/PROJECT_MAP.json');
const ledger=json('development/DEVELOPMENT_OBLIGATION_LEDGER.json');
const skills=json('skills/NATIVE_SKILL_REGISTRY.json');
const graph=json('rehydration/RELATIONAL_DEPENDENCY_MAP.json');
const parity=json('integration/ADAPTER_PARITY_LEDGER.json');
const pointer=json('CURRENT_POINTER.json');
assert.equal(manifest.system, OWNER);
assert.equal(pointer.system, OWNER);
assert.equal(ledger.authority, OWNER);
assert.equal(skills.owner, OWNER);
assert.equal(graph.owner, OWNER);
assert.equal(parity.authority, OWNER);
assert.equal(manifest.core_evolution_v1.required_carriers.length, 8);
for(const carrier of manifest.core_evolution_v1.required_carriers){
  assert.ok(existsSync(root+carrier), 'missing manifest carrier: '+carrier);
}
const projectIds=new Set(map.projects.map(x=>x.id));
assert.ok(projectIds.has('GOVEE_CONTROL') && projectIds.has('LIGHT_ORCHESTRA'));
const intro=map.projects.find(x=>x.id==='INTRO');
assert.deepEqual(new Set(intro.subprojects.map(x=>x.id)),new Set(['INTRO_V1_10','INTRO_V1_5']));
assert.notEqual(map.projects.find(x=>x.id==='GOVEE_CONTROL').id,map.projects.find(x=>x.id==='LIGHT_ORCHESTRA').id);
const allowedProjectIds=new Set([...projectIds,'CORE',...intro.subprojects.map(x=>x.id)]);
for(const obligation of ledger.obligations) assert.ok(allowedProjectIds.has(obligation.project_id),'orphan obligation: '+obligation.id);
reconcileObligations(ledger.obligations,'CORE');
const unique=new Set();
for(const relation of graph.relations){
 assert.ok(relation.id && !unique.has(relation.id));unique.add(relation.id);
 assert.ok(relation.source && relation.why && relation.meaning && relation.boundaries?.length);
 assert.ok(existsSync(relation.source),'missing relation source: '+relation.id);
}
const skillIds=new Set();
for(const skill of skills.skills){
 assert.ok(!skillIds.has(skill.id));skillIds.add(skill.id);
 assert.equal(skill.native_owner,OWNER);
 assert.ok(existsSync(skill.canonical_contract),'missing skill contract: '+skill.id);
 assert.notEqual(resolveSkill(skill,'CORE',[]).status,'REJECTED');
}
for(const surface of parity.surfaces){
 assert.ok(surface.status && surface.actual_host_release);
 assert.notEqual(surface.actual_host_release,'VERIFIED','host release must have separate proof');
}
const result=dashboardProjection({obligations:ledger.obligations,scope:'CORE',head:pointer.core_evolution_20261017?.body_head,gates:pointer.open_gates});
assert.equal(result.decision_authority,false);
console.log(JSON.stringify({status:'SOURCE_CONTRACT_VALIDATION_PASS',manifest_carriers:8,projects:projectIds.size,intro_variants:2,obligations:ledger.obligations.length,relations:graph.relations.length,skills:skills.skills.length,parity_surfaces:parity.surfaces.length,host_runtime:'NOT_TESTED'},null,2));
