// 666STREAM semantic visual intelligence — pure GPT-native view projection.
// Source-backed presentation only: no host UI dispatch, routing, network or mutation.
export const VISUAL_OWNER='666STREAM_STRUCTURE_CONTROL';
export const TRIGGERS=Object.freeze(['SYSTEMSTART','UPDATE','WEITER','NEW CHAT','NEXT CHAT','AUDIT','DASHBOARD','VORNE','FUCK HORST','MASTER BRIDGE HANDOFF']);
const statuses=new Set(['VERIFIED','PARTIAL','READBACK_PENDING','BLOCKED','CONFLICT_QUARANTINE','PROPOSED','NOT_TESTED','NOT_APPLICABLE']);
const valid=x=>typeof x==='string'&&x.length>0;
export function normalizeEvidence(e={}){
  if(!e || typeof e!=='object')return {status:'READBACK_PENDING',reason:'NO_EVIDENCE'};
  const source=valid(e.source_path)&&valid(e.source_commit)&&valid(e.source_blob);
  if(!source)return {status:'READBACK_PENDING',reason:'MISSING_SOURCE_IDENTITY'};
  if(e.conflict===true)return {status:'CONFLICT_QUARANTINE',source_path:e.source_path,source_commit:e.source_commit,source_blob:e.source_blob};
  if(e.independent_readback!==true)return {status:'READBACK_PENDING',reason:'INDEPENDENT_READBACK_MISSING',source_path:e.source_path};
  return {status:'VERIFIED',source_path:e.source_path,source_commit:e.source_commit,source_blob:e.source_blob};
}
export function projectView({trigger='UPDATE',scope='CORE',repository,branch,head,pointer,evidence=[],gates=[],actions=[],return_anchor=null}={}){
  if(!TRIGGERS.includes(trigger))return {status:'BLOCKED',reason:'UNSUPPORTED_VISUAL_TRIGGER'};
  const rows=(Array.isArray(evidence)?evidence:[]).map(normalizeEvidence);
  const verified=rows.filter(x=>x.status==='VERIFIED').length;
  const conflicts=rows.filter(x=>x.status==='CONFLICT_QUARANTINE').length;
  const projectStatus=!valid(head)||!valid(pointer)?'READBACK_PENDING':conflicts?'CONFLICT_QUARANTINE':rows.length===0||rows.some(x=>x.status!=='VERIFIED')?'PARTIAL':'VERIFIED';
  const safeActions=(Array.isArray(actions)?actions:[]).filter(a=>a&&valid(a.label)&&['COPY','OPEN_VERIFIED_URL','ISSUE_NATIVE_TURN'].includes(a.kind)&&valid(a.payload)&&a.evidence_verified===true);
  return {owner:VISUAL_OWNER,status:projectStatus,trigger,scope,identity:{repository:repository||null,branch:branch||null,head:head||null,pointer:pointer||null},evidence:rows,measured:{verified,total:rows.length},open_gates:Array.isArray(gates)?gates.filter(valid):[],actions:safeActions,return_anchor,decision_authority:false,host_acceptance:'INDEPENDENT_PROOF_REQUIRED'};
}
export function evidenceLanes(lanes={}){
  const names=['SOURCE','DELIVERY','ADOPTION','HOST'];
  const result={};
  for(const key of names){
    const v=lanes[key];
    result[key]={status:v&&statuses.has(v.status)?v.status:'READBACK_PENDING',evidence:v?.evidence||null};
  }
  return result;
}
export function validateVisualContract(contract){
  if(!contract||contract.owner!==VISUAL_OWNER||contract.decision_authority!==false)return {status:'BLOCKED'};
  if(!Array.isArray(contract.required_triggers)||TRIGGERS.some(t=>!contract.required_triggers.includes(t)))return {status:'PARTIAL',reason:'MISSING_TRIGGER'};
  if(contract.source_to_host_pass_automatic!==false||contract.pseudo_buttons_allowed!==false)return {status:'BLOCKED',reason:'VISUAL_GOVERNANCE'};
  return {status:'SOURCE_CONTRACT_READY',fresh_host:'READBACK_PENDING'};
}


// One existing visual engine: the five slots are presentation choices, not a router.
// A slot is shown only with an evidence-backed executable native action.
export const FIVE_OPTION_SLOTS=Object.freeze([
  'PROJECT_SELECTION',
  'BEARBEITEN_WEITERENTWICKELN',
  'WEITER',
  'DASHBOARD',
  'VORNE'
]);
export function projectFiveOptions({available_actions=[],blocked_reasons={}}={}){
  const accepted=new Map();
  for(const a of Array.isArray(available_actions)?available_actions:[]){
    if(!a || !FIVE_OPTION_SLOTS.includes(a.slot) || accepted.has(a.slot))continue;
    if(!['ISSUE_NATIVE_TURN','COPY','OPEN_VERIFIED_URL'].includes(a.kind))continue;
    if(!valid(a.label)||!valid(a.payload)||a.evidence_verified!==true)continue;
    accepted.set(a.slot,{slot:a.slot,label:a.label,kind:a.kind,payload:a.payload,verified:true});
  }
  return FIVE_OPTION_SLOTS.map(slot=>accepted.get(slot)||{
    slot,available:false,reason:valid(blocked_reasons?.[slot])?blocked_reasons[slot]:'NO_VERIFIED_ACTION'
  });
}
// A source/Node check cannot pronounce HOST_PASS. Actual visual completion requires
// a complete projection, one real continuation or an explicit BLOCKED reason,
// and separately authenticated host interaction proof for host acceptance.
export function visualCompletionGuard({
  projection,options=[],rendered_sections=[],source_verified=false,
  host_action_observed=false,host_action_independently_verified=false,
  fresh_chat_verified=false,plugin_parity={}
}={}){
  const missing=[];
  if(!projection || !valid(projection.identity?.head)||!valid(projection.identity?.pointer))missing.push('CURRENT_MISSING');
  if(source_verified!==true)missing.push('SOURCE_READBACK_MISSING');
  for(const key of ['NATIVE_IDENTITY_AND_CURRENT','EVIDENCE_LEVELS_SOURCE_DELIVERY_ADOPTION_HOST','ACTIVE_SCOPE_AND_RETURN_ANCHOR','COMPLETED_AND_OPEN_OBLIGATIONS','BLOCKERS_AND_REGRESSION','VALID_CONTEXTUAL_ACTIONS']){
    if(!Array.isArray(rendered_sections)||!rendered_sections.includes(key))missing.push('SECTION_'+key);
  }
  const slots=Array.isArray(options)?options:[];
  if(slots.length!==FIVE_OPTION_SLOTS.length||slots.some((o,i)=>o?.slot!==FIVE_OPTION_SLOTS[i]))missing.push('FIVE_OPTIONS_CONTRACT');
  const actionable=slots.some(o=>o?.verified===true && valid(o.payload) && ['ISSUE_NATIVE_TURN','COPY','OPEN_VERIFIED_URL'].includes(o.kind));
  const explainedBlock=slots.every(o=>o?.available===false&&valid(o.reason));
  if(!actionable&&!explainedBlock)missing.push('NO_REAL_NEXT_STEP_OR_EXPLAINED_BLOCK');
  const source_ready=missing.length===0;
  const host_verified=source_ready && host_action_observed===true && host_action_independently_verified===true && fresh_chat_verified===true;
  return {
    status:host_verified?'HOST_PASS':source_ready?'SOURCE_COMPLETION_READY':'BLOCKED',
    missing,source_ready,host_verified,
    account_plugin_parity:plugin_parity?.account==='VERIFIED'?'VERIFIED':'READBACK_PENDING',
    native_plugin_parity:plugin_parity?.native==='VERIFIED'?'VERIFIED':'READBACK_PENDING',
    authority:false
  };
}
