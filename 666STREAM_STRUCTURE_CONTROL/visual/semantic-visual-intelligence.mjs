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
