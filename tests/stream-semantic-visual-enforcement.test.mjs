import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TRIGGERS,normalizeEvidence,projectView,evidenceLanes,validateVisualContract,FIVE_OPTION_SLOTS,projectFiveOptions,visualCompletionGuard} from '../666STREAM_STRUCTURE_CONTROL/visual/semantic-visual-intelligence.mjs';
const root='666STREAM_STRUCTURE_CONTROL/';
const c=JSON.parse(readFileSync(root+'visual/VISUAL_ENFORCEMENT_CONTRACT.json','utf8'));
const m=JSON.parse(readFileSync(root+'REHYDRATION_MANIFEST.json','utf8'));
const s=JSON.parse(readFileSync(root+'skills/NATIVE_SKILL_REGISTRY.json','utf8'));
const dashboard=readFileSync(root+'current/CORE_DASHBOARD_CONTRACT.md','utf8');
test('visual is a required native presentation facet not an authority',()=>{assert.equal(validateVisualContract(c).status,'SOURCE_CONTRACT_READY');assert.equal(c.decision_authority,false);assert.equal(c.no_automatic_foreign_activation,true);assert.equal(c.pseudo_buttons_allowed,false);assert.ok(m.semantic_visual_intelligence.always_for_native_triggers);assert.ok(s.skills.some(x=>x.id==='semantic-visual-intelligence'));assert.match(dashboard,/NO_DEAD_END_ON_UPDATE=true/);});
test('all native triggers have visual coverage and return choices',()=>{for(const trigger of TRIGGERS){assert.ok(c.required_triggers.includes(trigger));assert.equal(projectView({trigger,head:'c',pointer:'p',evidence:[]}).status,'PARTIAL');}});
test('verified state requires independent actual source identity',()=>{assert.equal(normalizeEvidence({source_path:'p'}).status,'READBACK_PENDING');assert.equal(normalizeEvidence({source_path:'p',source_commit:'c',source_blob:'b',independent_readback:true}).status,'VERIFIED');});
test('no fake green when evidence missing or contradictory',()=>{assert.equal(projectView({head:'h',pointer:'p'}).status,'PARTIAL');assert.equal(projectView({head:'h',pointer:'p',evidence:[{source_path:'p',source_commit:'c',source_blob:'b',conflict:true}]}).status,'CONFLICT_QUARANTINE');});
test('only real evidence-approved actions are surfaced',()=>{const x=projectView({trigger:'UPDATE',head:'h',pointer:'p',actions:[{kind:'COPY',label:'Copy',payload:'text',evidence_verified:true},{kind:'OPEN_VERIFIED_URL',label:'Bogus',payload:'url',evidence_verified:false},{kind:'FAKE_BUTTON',label:'Fake',payload:'x',evidence_verified:true}]});assert.equal(x.actions.length,1);assert.equal(x.actions[0].label,'Copy');assert.equal(x.decision_authority,false);});
test('four evidence lanes do not infer host from source',()=>{const x=evidenceLanes({SOURCE:{status:'VERIFIED',evidence:'blob'}});assert.equal(x.SOURCE.status,'VERIFIED');assert.equal(x.DELIVERY.status,'READBACK_PENDING');assert.equal(x.ADOPTION.status,'READBACK_PENDING');assert.equal(x.HOST.status,'READBACK_PENDING');});

test('five slots are stable, context-gated and do not become a second router',()=>{
  assert.deepEqual(c.five_option_contract.slots,FIVE_OPTION_SLOTS);
  const options=projectFiveOptions({available_actions:[{slot:'WEITER',label:'Fortsetzen',kind:'ISSUE_NATIVE_TURN',payload:'666STREAM WEITER',evidence_verified:true},{slot:'VORNE',label:'Fake',kind:'ISSUE_NATIVE_TURN',payload:'666STREAM VORNE',evidence_verified:false}]});
  assert.equal(options.length,5);
  assert.equal(options[2].verified,true);
  assert.equal(options[4].available,false);
  assert.equal(options[4].reason,'NO_VERIFIED_ACTION');
});
test('completion guard blocks incomplete UI rather than inventing host success',()=>{
  const projection=projectView({head:'h',pointer:'p'});
  const sections=c.required_sections;
  const slots=projectFiveOptions({available_actions:[{slot:'WEITER',label:'Weiter',kind:'ISSUE_NATIVE_TURN',payload:'666STREAM WEITER',evidence_verified:true}]});
  assert.equal(visualCompletionGuard({projection,options:slots.slice(0,4),rendered_sections:sections,source_verified:true}).status,'BLOCKED');
  const source=visualCompletionGuard({projection,options:slots,rendered_sections:sections,source_verified:true,host_action_observed:true});
  assert.equal(source.status,'SOURCE_COMPLETION_READY');
  assert.equal(source.host_verified,false);
  assert.equal(source.account_plugin_parity,'READBACK_PENDING');
  assert.equal(source.native_plugin_parity,'READBACK_PENDING');
  assert.equal(visualCompletionGuard({projection,options:slots,rendered_sections:sections,source_verified:true,host_action_observed:true,host_action_independently_verified:true,fresh_chat_verified:true}).status,'SOURCE_COMPLETION_READY');
  const host_receipt={type:'INDEPENDENT_HOST_ACTION_READBACK',session_id:'session',user_action_id:'action',turn_id:'turn',observed_action:'ISSUE_NATIVE_TURN',independent_readback_source:'host-observer',current_head:'h',current_pointer:'p',same_scoped_session:true,fresh_chat_observed:true};
  assert.equal(visualCompletionGuard({projection,options:slots,rendered_sections:sections,source_verified:true,host_action_observed:true,host_action_independently_verified:true,fresh_chat_verified:true,host_receipt}).status,'HOST_PASS');
  assert.equal(visualCompletionGuard({projection,options:slots,rendered_sections:sections,source_verified:true,host_action_observed:true,host_action_independently_verified:true,fresh_chat_verified:true,host_receipt:{...host_receipt,current_head:'forged'}}).status,'SOURCE_COMPLETION_READY');
});
test('no valid actions requires explicit reasons for all slots',()=>{
  const projection=projectView({head:'h',pointer:'p'});
  const slots=projectFiveOptions({});
  const passed=visualCompletionGuard({projection,options:slots,rendered_sections:c.required_sections,source_verified:true});
  assert.equal(passed.status,'SOURCE_COMPLETION_READY');
  assert.equal(passed.host_verified,false);
});
