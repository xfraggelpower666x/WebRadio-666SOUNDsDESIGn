// Canonical 666STREAM Bridge evidence evaluation. Pure, fail-closed, no transport or mutation.
export const EVIDENCE_LEVELS=Object.freeze(['SOURCE_READBACK','DELIVERED_EVIDENCED','NATIVE_ADOPTION','FRESH_HOST_PASS']);
const present=x=>typeof x==='string'&&x.trim().length>0;
export function assessTransportReceipt(r){
  const failures=[];
  if(!r||typeof r!=='object')return {status:'READBACK_PENDING',failures:['NO_RECEIPT']};
  for(const k of ['source_repository','source_head','target_repository','target_branch','target_head_before','target_commit','target_tree','target_blob','target_path','source_sha256','remote_sha256'])if(!present(r[k]))failures.push('MISSING_'+k.toUpperCase());
  if(!Number.isSafeInteger(r.source_bytes)||r.source_bytes<0||!Number.isSafeInteger(r.remote_bytes)||r.remote_bytes<0)failures.push('BYTES_UNVERIFIED');
  if(r.source_bytes!==r.remote_bytes||r.source_sha256!==r.remote_sha256)failures.push('BYTE_IDENTITY_MISMATCH');
  if(r.expected_target_head && r.expected_target_head!==r.target_head_before)failures.push('HEAD_CONFLICT');
  if(r.source_head_at_intake && r.source_head_at_intake!==r.source_head && !r.source_supersession_reviewed)failures.push('SOURCE_SUPERSESSION_UNREVIEWED');
  // A sender-supplied Boolean alone is never evidence. Independently fetched
  // commit -> tree -> blob -> bytes/hash must be cross-bound by exact identity.
  const p=r.evidence;
  if(!p || p.observer!=='INDEPENDENT_REPOSITORY_READBACK' || !present(p.observation_id) || p.sender_self_attestation===true)failures.push('MISSING_INDEPENDENT_OBSERVER_EVIDENCE');
  if(!p?.commit || p.commit.sha!==r.target_commit || p.commit.tree_sha!==r.target_tree || !present(p.commit.readback_source))failures.push('COMMIT_TREE_BINDING_UNVERIFIED');
  if(!p?.tree || p.tree.sha!==r.target_tree || p.tree.path!==r.target_path || p.tree.blob_sha!==r.target_blob || !present(p.tree.readback_source))failures.push('TREE_BLOB_PATH_BINDING_UNVERIFIED');
  if(!p?.blob || p.blob.sha!==r.target_blob || p.blob.byte_size!==r.remote_bytes || p.blob.sha256!==r.remote_sha256 || !present(p.blob.readback_source))failures.push('BLOB_BYTES_HASH_BINDING_UNVERIFIED');
  if(!p?.freshness || p.freshness.target_head_before!==r.target_head_before || p.freshness.target_commit_after!==r.target_commit || p.freshness.head_rechecked!==true || !present(p.freshness.readback_source))failures.push('HEAD_FRESHNESS_UNVERIFIED');
  if(r.source_authority_verified!==true || r.target_authority_verified!==true)failures.push('SCOPE_AUTHORITY_UNVERIFIED');
  if(r.force_push===true||r.unauthorized_paths===true||r.secrets_in_receipt===true)failures.push('FORBIDDEN_TRANSFER');
  return {status:failures.length?'READBACK_PENDING':'DELIVERED_EVIDENCED',failures,adoption:'NOT_PROVEN',host:'NOT_PROVEN'};
}
export function classifyHandoff(e){
  if(!e||!present(e.source_blob)||!present(e.source_path))return {source:'READBACK_PENDING',delivery:'NOT_PROVEN',adoption:'NOT_PROVEN',host:'NOT_PROVEN'};
  const source=e.actual_blob_readback===true&&e.source_blob===e.observed_blob?'SOURCE_READBACK':'READBACK_PENDING';
  const delivery=source==='SOURCE_READBACK'&&e.actual_independent_delivery_receipt===true?'DELIVERED_EVIDENCED':'NOT_PROVEN';
  const adoption=delivery==='DELIVERED_EVIDENCED'&&e.native_owner_adoption_commit_verified===true?'NATIVE_ADOPTION':'NOT_PROVEN';
  const host=adoption==='NATIVE_ADOPTION'&&e.fresh_host_behavior_observed===true?'FRESH_HOST_PASS':'NOT_PROVEN';
  return {source,delivery,adoption,host};
}
export function provenanceGate(previous,incoming){
  if(!incoming||!present(incoming.event_id)||!present(incoming.fingerprint))return 'READBACK_PENDING';
  if(previous?.event_id===incoming.event_id&&previous.fingerprint===incoming.fingerprint)return 'DUPLICATE_ACKNOWLEDGED';
  if(previous?.event_id===incoming.event_id&&previous.fingerprint!==incoming.fingerprint&&!incoming.supersedes?.includes(previous.fingerprint))return 'CONFLICT_QUARANTINE';
  if(previous?.valid_source_head && incoming.source_head!==previous.valid_source_head&&!incoming.freshness_independently_verified)return 'CONFLICT_QUARANTINE';
  return 'CANDIDATE_NATIVE_REVIEW';
}
export function visualEvidenceCard(e){
  const state=classifyHandoff(e);
  return {title:e?.title||'Bridge peer evidence',source:state.source,delivery:state.delivery,adoption:state.adoption,host:state.host,source_path:e?.source_path||null,blob:e?.observed_blob||null,visual_compliance:e?.visual_compliance||'UNKNOWN',decision_authority:false};
}
export function checkDiscoveryBudget(checks,mandatory=false){
  if(mandatory)return {decision:'REQUIRED_SAFETY_CHECK',remaining:null};
  const unique=new Set((Array.isArray(checks)?checks:[]).filter(x=>present(x)));
  return {decision:unique.size>=3?'SAFE_EXPERIMENT_OR_BLOCK_WITH_ANCHOR':'CHECK_HYPOTHESIS',remaining:Math.max(0,3-unique.size)};
}
