import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OWNER, STATES, reconcileObligations, selectResumeAnchor, resolveSkill, judgeRelation, intakeLearning, parityDecision, dashboardProjection} from '../666STREAM_STRUCTURE_CONTROL/runtime/core-intelligence.mjs';
const base='666STREAM_STRUCTURE_CONTROL/';
const load=x=>JSON.parse(readFileSync(base+x,'utf8'));
const ledger=load('development/DEVELOPMENT_OBLIGATION_LEDGER.json');
const skills=load('skills/NATIVE_SKILL_REGISTRY.json');
const manifest=load('REHYDRATION_MANIFEST.json');
test('native owner and rehydration requires all eight capability contracts',()=>{
  assert.equal(OWNER,'666STREAM_STRUCTURE_CONTROL');
  assert.equal(manifest.core_evolution_v1.required_carriers.length,8);
  for(const path of manifest.core_evolution_v1.required_carriers){
    assert.ok(readFileSync(base+path,'utf8').length>40);
  }
});
test('every source ledger obligation has evidence and never silently promotes',()=>{
  assert.ok(ledger.obligations.length>=5);
  const rows=reconcileObligations(ledger.obligations,'CORE');
  assert.equal(rows.length,ledger.obligations.length);
  assert.ok(rows.find(x=>x.id==='GOVEE_CONTROL_CAPABILITIES' && !x.foreground_eligible));
  assert.throws(()=>reconcileObligations([{id:'fake',project_id:'CORE',state:'PROMOTED_CURRENT'}],'CORE'),/unverified promotion/);
  assert.throws(()=>reconcileObligations([{id:'x',project_id:'CORE',state:'PROPOSED'},{id:'x',project_id:'CORE',state:'PROPOSED'}],'CORE'),/duplicate/);
});
test('resume resolves same scope and valid lineage only',()=>{
  const a=[{project_id:'WEBRADIO',validated:true,source_commit:'abc',sequence:100,completed_steps:[],return_step:'wrong'},
    {project_id:'CORE',validated:true,source_commit:'abc',sequence:1,completed_steps:['done'],return_step:'next'}];
  assert.equal(selectResumeAnchor(a,'CORE','abc').step,'next');
  assert.equal(selectResumeAnchor(a,'GOVEE_CONTROL','abc').status,'READBACK_PENDING');
});
test('skills reference native contracts but never become independent authority',()=>{
  assert.equal(skills.owner,OWNER);
  assert.equal(skills.foreign_autoactivation,false);
  for(const s of skills.skills)assert.equal(s.native_owner,OWNER);
  const item=skills.skills.find(x=>x.id==='continuity');
  assert.equal(resolveSkill(item,'CORE',['CURRENT_POINTER','PROJECT_MAP']).status,'REFERENCE_READY');
  assert.equal(resolveSkill(item,'CORE',[]).status,'READBACK_PENDING');
  assert.equal(resolveSkill({...item,native_owner:'LYVRA'},'CORE',['CURRENT_POINTER','PROJECT_MAP']).status,'REJECTED');
});
test('relational evidence rejects names-only and unverified source',()=>{
  const sample={owner:OWNER,id:'link',meaning:'shared metadata',why:'same player pipeline',boundaries:['no foreign write'],source:'x'};
  assert.equal(judgeRelation(sample,[]).status,'READBACK_PENDING');
  assert.equal(judgeRelation(sample,[{path:'x',verified:true}]).status,'EVIDENCE_LINKED');
  assert.equal(judgeRelation({...sample,boundaries:[]},[]).status,'PARTIAL');
});
test('causal learning requires outcomes and quarantine contradictions',()=>{
  const c={owner:OWNER,id:'a',fingerprint:'2',hypothesis:'repair',supersedes:[]};
  assert.equal(intakeLearning(c,[]).status,'CANDIDATE_ONLY');
  assert.equal(intakeLearning(c,[{id:'a',fingerprint:'1'}]).status,'CONFLICT_QUARANTINE');
  assert.equal(intakeLearning({...c,observed_outcome:'pass',outcome_evidence:{source:'github',commit:'a'}},[]).status,'VALIDATED_OUTCOME_CANDIDATE');
});
test('plugin parity deduplicates and never grants authority',()=>{
  const e={event_id:'e',source_surface:'host',semantic_fingerprint:'1',source_release_id:'r',actual_readback:true};
  assert.equal(parityDecision(e,[{event_id:'e',semantic_fingerprint:'1'}]).status,'ACKNOWLEDGED_NO_REEMISSION');
  assert.equal(parityDecision({...e,source_release_id:null},[]).status,'READBACK_PENDING');
  assert.equal(parityDecision(e,[]).mutation_authority,false);
});
test('core dashboard keeps project obligations scoped',()=>{
 const d=dashboardProjection({obligations:ledger.obligations,scope:'CORE',head:'abc',anchors:[],gates:['FRESH_HOST_PENDING']});
 assert.equal(d.decision_authority,false);
 assert.ok(d.open.every(x=>x.project_id==='CORE'));
 assert.ok(d.open_gates.includes('FRESH_HOST_PENDING'));
});
