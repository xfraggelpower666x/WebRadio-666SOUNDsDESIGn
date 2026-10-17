// 666STREAM native Core Intelligence — side-effect-free development helper.
// No network, filesystem mutation, UI control, secret access or background worker.
export const OWNER = '666STREAM_STRUCTURE_CONTROL';
export const STATES = Object.freeze(['PROPOSED','DEV_ACTIVE','PAUSED','BLOCKED','ACCEPTED_PENDING_PROMOTION','DEFERRED_WITH_REASON','REJECTED_WITH_REASON','SUPERSEDED','PROMOTED_CURRENT','READBACK_PENDING']);
const evidence = x => !!x && typeof x === 'object' && typeof x.source === 'string' && x.source.length > 0;
export function reconcileObligations(items, currentScope) {
  if (!Array.isArray(items)) throw Error('obligations must be array');
  const ids = new Set();
  return items.map(item => {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) throw Error('duplicate or missing obligation ID');
    ids.add(item.id);
    if (!STATES.includes(item.state)) throw Error('unknown obligation state: '+item.id);
    if (!item.project_id || typeof item.project_id !== 'string') throw Error('obligation missing project');
    if (item.state === 'PROMOTED_CURRENT' && (!evidence(item.promotion_evidence) || !item.promotion_evidence.commit)) throw Error('unverified promotion: '+item.id);
    return {...item, foreground_eligible: item.project_id === currentScope && !['PROMOTED_CURRENT','SUPERSEDED','REJECTED_WITH_REASON'].includes(item.state)};
  });
}
export function selectResumeAnchor(anchors, scope, head) {
  const valid=(Array.isArray(anchors)?anchors:[]).filter(a=>a && a.project_id===scope && a.validated===true && a.superseded!==true && a.source_commit && Array.isArray(a.completed_steps) && a.return_step && (!a.expected_head || a.expected_head===head));
  valid.sort((a,b)=>(b.sequence||0)-(a.sequence||0));
  const anchor=valid[0]||null;
  return anchor?{status:'RESUME_ELIGIBLE',anchor,step:anchor.return_step}:{status:'READBACK_PENDING',reason:'NO_VALID_SAME_SCOPE_ANCHOR'};
}
export function resolveSkill(skill, scope, available = []) {
  if (!skill || skill.native_owner!==OWNER || !skill.canonical_contract || !skill.id) return {status:'REJECTED',reason:'INVALID_NATIVE_SKILL'};
  if (!skill.allowed_scopes?.includes(scope) && !skill.allowed_scopes?.includes('ANY_VERIFIED_SCOPE')) return {status:'BLOCKED',reason:'SCOPE_MISMATCH'};
  const missing=(skill.requires||[]).filter(v=>!available.includes(v));
  return missing.length?{status:'READBACK_PENDING',missing}:{status:'REFERENCE_READY',contract:skill.canonical_contract};
}
export function judgeRelation(relation, sources = []) {
  if (!relation || relation.owner!==OWNER) return {status:'REJECTED',reason:'FOREIGN_OWNER'};
  if (!relation.meaning || !relation.why || !Array.isArray(relation.boundaries) || !relation.boundaries.length) return {status:'PARTIAL',reason:'RELATIONAL_SEMANTICS_INCOMPLETE'};
  const found=sources.find(s=>s.path===relation.source && s.verified===true && (!relation.blob_sha || relation.blob_sha===s.blob_sha));
  return found?{status:'EVIDENCE_LINKED',relationship:relation.id}:{status:'READBACK_PENDING',reason:'SOURCE_NOT_VERIFIED'};
}
export function intakeLearning(candidate, existing=[]) {
  if (!candidate || candidate.owner!==OWNER || !candidate.hypothesis) return {status:'REJECTED',reason:'INVALID_CANDIDATE'};
  const same=existing.find(x=>x.id===candidate.id);
  if (same?.fingerprint===candidate.fingerprint) return {status:'NO_CHANGE',reason:'DUPLICATE_EVENT'};
  if (same && same.fingerprint!==candidate.fingerprint && !candidate.supersedes?.includes(same.fingerprint)) return {status:'CONFLICT_QUARANTINE'};
  if (!candidate.observed_outcome || !evidence(candidate.outcome_evidence) || !candidate.outcome_evidence.commit) return {status:'CANDIDATE_ONLY'};
  return {status:'VALIDATED_OUTCOME_CANDIDATE',authority:'NATIVE_UPDATE_REQUIRED'};
}
export function parityDecision(event, accepted=[]) {
  if (!event || !event.event_id || !event.source_surface || !event.semantic_fingerprint) return {status:'READBACK_PENDING'};
  if (accepted.some(x=>x.event_id===event.event_id && x.semantic_fingerprint===event.semantic_fingerprint)) return {status:'ACKNOWLEDGED_NO_REEMISSION'};
  if (!event.source_release_id || !event.actual_readback) return {status:'READBACK_PENDING'};
  return {status:'NATIVE_IMPACT_REVIEW_REQUIRED',mutation_authority:false};
}
export function dashboardProjection({obligations=[],scope='CORE',head,anchors=[],gates=[]}={}) {
  const rows=reconcileObligations(obligations,scope);
  const resume=selectResumeAnchor(anchors,scope,head);
  return {owner:OWNER,scope,head:head||null,open:rows.filter(x=>x.foreground_eligible),closed:rows.filter(x=>!x.foreground_eligible),resume,open_gates:gates,decision_authority:false};
}
