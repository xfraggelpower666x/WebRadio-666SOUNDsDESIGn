// 666STREAM-native peer gate inspired by verified LYVRA SuperCodeForge contracts.
// This does not import LYVRA identity, triggers, runtime authority, or mutation rights.
const SHA=/^[a-f0-9]{40}$/i;

export const BOUNDARY=Object.freeze({
  owner:'666STREAM_STRUCTURE_CONTROL',
  executor:'666-RADIO-CODEFORGE-001',
  peer:'WHOLE_LYVRA/SUPERCODEFORGE',
  foreign_writes:false,
  foreign_activation:false,
  new_router:false,
  host_pass_claim:false
});

const fail=(code)=>Object.freeze({
  status:'DENIED',code,
  source_verified:false,ci_verified:false,host_verified:false,
  mutation_authorized:false,foreign_activation:false
});
const partial=(code,extra={})=>Object.freeze({
  status:'PARTIAL',code,
  source_verified:false,ci_verified:false,host_verified:false,
  mutation_authorized:false,foreign_activation:false,...extra
});

export function classifyEvidence(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))return fail('INVALID_EVIDENCE');
  if(input.foreign_write===true||input.foreign_activation===true)return fail('FOREIGN_AUTHORITY_DENIED');
  if(input.source_commit!==undefined&&!SHA.test(String(input.source_commit)))return fail('IMMUTABLE_COMMIT_REQUIRED');
  if(input.expected_blob_sha!==undefined&&!SHA.test(String(input.expected_blob_sha)))return fail('EXPECTED_BLOB_REQUIRED');

  const source=!!input.source_readback;
  const ci=!!input.ci_run_verified;
  const host=!!input.host_runtime_verified;

  if(host&&!ci)return fail('HOST_WITHOUT_CI_EVIDENCE_DENIED');
  if(ci&&!source)return fail('CI_WITHOUT_SOURCE_READBACK_DENIED');

  return Object.freeze({
    status:host?'HOST_VERIFIED':ci?'CI_VERIFIED':source?'SOURCE_VERIFIED':'OPEN',
    source_verified:source,
    ci_verified:ci,
    host_verified:host,
    mutation_authorized:false,
    foreign_activation:false,
    evidence_class:host?'HOST_RUNTIME':ci?'INDEPENDENT_CI':source?'SOURCE_READBACK':'OPEN'
  });
}

export function evaluateHandoff(envelope={},ledger=[]){
  if(!envelope||typeof envelope!=='object'||Array.isArray(envelope))return fail('INVALID_HANDOFF');
  if(envelope.owner!=='666STREAM_STRUCTURE_CONTROL')return fail('OWNER_SCOPE_DENIED');
  if(envelope.receiver!=='666-RADIO-CODEFORGE-001')return fail('RECEIVER_SCOPE_DENIED');
  if(envelope.permission!=='READ_ONLY_PEER_REFERENCE')return fail('PERMISSION_DENIED');
  if(envelope.mutation!==false)return fail('MUTATION_DENIED');
  if(!SHA.test(String(envelope.source_commit||''))||!SHA.test(String(envelope.source_blob||'')))return fail('IMMUTABLE_SOURCE_REQUIRED');
  if(typeof envelope.replay_key!=='string'||envelope.replay_key.length<8)return fail('REPLAY_KEY_INVALID');
  if(!Array.isArray(ledger))return partial('LEDGER_REQUIRED');
  if(ledger.some(x=>x?.replay_key===envelope.replay_key))return fail('REPLAY_DENIED');
  if(envelope.supersedes&&ledger.some(x=>x?.supersedes===envelope.replay_key))return fail('SUPERSEDED_DENIED');
  return Object.freeze({
    status:'ELIGIBLE_READ_ONLY_PEER_REFERENCE',
    source_verified:false,ci_verified:false,host_verified:false,
    mutation_authorized:false,foreign_activation:false
  });
}

export function forgeDecision({
  hypothesis_checks=0,
  current_authority_verified=false,
  reversible_action_available=false,
  demonstrated_defect=false,
  evidence={}
}={}){
  const ev=classifyEvidence(evidence);
  if(ev.status==='DENIED')return ev;
  if(!current_authority_verified)return partial('CURRENT_AUTHORITY_REQUIRED',{evidence:ev});
  if(!demonstrated_defect)return Object.freeze({status:'NO_WRITE',code:'NO_DEMONSTRATED_DEFECT',evidence:ev});
  if(hypothesis_checks>=3&&reversible_action_available)
    return Object.freeze({status:'LEARNING_BY_DOING',code:'SMALLEST_SAFE_REVERSIBLE_ACTION',evidence:ev});
  return Object.freeze({status:'REPAIR_ALLOWED_BY_LOCAL_AUTHORITY_ONLY',code:'TARGETED_CAUSE_FIRST_REPAIR',evidence:ev});
}
