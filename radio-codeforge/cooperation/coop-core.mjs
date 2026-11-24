/**
 * 666STREAM WEBRADIO: development-only, deterministic peer-cooperation planner.
 * NOT a runtime daemon, agent launcher, source mutation tool or transport bridge.
 * LYVRA Coding Profi may lead technical review, while all writes remain authorized
 * and executed solely under 666STREAM's native repository scope.
 */
import { createHash } from 'node:crypto';

export const CONTRACT = Object.freeze({
  schema: '666STREAM_CODEFORGE_COOP_R01',
  owner: '666STREAM_STRUCTURE_CONTROL',
  project: 'WEBRADIO',
  local_executor: '666-RADIO-CODEFORGE-001',
  technical_lead: 'LYVRA_CODING_PROFI',
  foreign_authority: false,
  peer_dispatch_enabled: false,
  runtime_integration: false,
  source_mutation_authority: false,
  deployment_authority: false,
  canonical_transport: '666STREAM-CODEFORGE-ARTIFACT-BRIDGE'
});

const SHA = /^[a-f0-9]{40}$/i;
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const allowedEvidence = new Set(['DECLARED', 'SOURCE_READBACK', 'CI_VERIFIED', 'HOST_VERIFIED']);
export class CooperationError extends Error {
  constructor(code, message) { super(message || code); this.name = 'CooperationError'; this.code = code; }
}
const stop = (code, message) => { throw new CooperationError(code, message); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const unique = xs => [...new Set(xs)];
const sorted = xs => [...xs].sort((a,b) => a.localeCompare(b, 'en'));
const safeArray = (x, code) => { if (!Array.isArray(x)) stop(code); return x; };
const safeId = (v, code) => { if (typeof v !== 'string' || !ID.test(v)) stop(code); return v; };
const scopes = v => sorted(unique(safeArray(v, 'INVALID_SCOPES').map(x => safeId(x, 'INVALID_SCOPE'))));
const intersect = (a,b) => a.some(x => b.includes(x));
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Read-only proof is always narrower than permission to execute. */
export function evidenceGate(peer = {}) {
  if (!object(peer)) stop('INVALID_PEER');
  const id = safeId(peer.id, 'INVALID_PEER_ID');
  if (!allowedEvidence.has(peer.evidence_level)) stop('INVALID_EVIDENCE_LEVEL');
  if (peer.foreign_write === true || peer.auto_activate === true || peer.authority_transfer === true)
    stop('FOREIGN_AUTHORITY_DENIED');
  const source = peer.source;
  if (peer.evidence_level !== 'DECLARED') {
    if (!object(source) || !SHA.test(String(source.commit || '')) || !SHA.test(String(source.blob || '')))
      stop('IMMUTABLE_SOURCE_REQUIRED');
    if (typeof source.repo !== 'string' || !source.repo.includes('/') || typeof source.path !== 'string' || !source.path.trim())
      stop('SOURCE_PROVENANCE_REQUIRED');
    if (peer.source_readback !== true) stop('SOURCE_READBACK_REQUIRED');
  }
  if (['CI_VERIFIED', 'HOST_VERIFIED'].includes(peer.evidence_level) && peer.ci_verified !== true)
    stop('CI_RECEIPT_REQUIRED');
  if (peer.evidence_level === 'HOST_VERIFIED' && peer.host_verified !== true)
    stop('HOST_RECEIPT_REQUIRED');
  return Object.freeze({id, level: peer.evidence_level, source_verified: peer.evidence_level !== 'DECLARED', ci_verified: !!peer.ci_verified, host_verified: !!peer.host_verified, mutation_authorized: false});
}

export function validateCatalog(catalog) {
  if (!object(catalog) || catalog.schema !== CONTRACT.schema || !Array.isArray(catalog.peers)) stop('CATALOG_SCHEMA_DENIED');
  const ids = new Set();
  const peers = catalog.peers.map(peer => {
    const proof = evidenceGate(peer);
    if (ids.has(proof.id)) stop('DUPLICATE_PEER');
    ids.add(proof.id);
    const capabilities = scopes(peer.capabilities);
    return Object.freeze({id: proof.id, capabilities, evidence: proof});
  });
  if (!ids.has(CONTRACT.local_executor) || !ids.has(CONTRACT.technical_lead)) stop('REQUIRED_PEER_MISSING');
  return Object.freeze(peers);
}

/**
 * Computes safe parallel waves only. Never calls peer tools, network, git or filesystem.
 * Each task has a single target project, an explicit read/write intention and deps.
 * Even proposals labelled WRITE cannot actually write; all output is PLAN_ONLY.
 */
export function planCooperation({catalog, tasks, current, budget} = {}) {
  const peers = validateCatalog(catalog);
  const byPeer = new Map(peers.map(peer => [peer.id,peer]));
  if (!object(current) || current.project !== CONTRACT.project || current.authority !== CONTRACT.owner || !SHA.test(String(current.commit || '')))
    stop('CURRENT_NATIVE_AUTHORITY_REQUIRED');
  if (!object(budget) || budget.zero_additional_eur !== true || budget.paid_credit_spend_allowed !== false)
    stop('ZERO_COST_POLICY_REQUIRED');
  if (budget.external_operations_authorized === true) stop('EXTERNAL_ACTION_DENIED');
  const jobs = safeArray(tasks, 'INVALID_TASKS');
  const jobsById = new Map();
  for (const task of jobs) {
    if (!object(task)) stop('INVALID_TASK');
    const id = safeId(task.id, 'INVALID_TASK_ID');
    if (jobsById.has(id)) stop('DUPLICATE_TASK');
    if (task.project !== CONTRACT.project) stop('FOREIGN_PROJECT_TASK_DENIED');
    if (!['READ','PROPOSE'].includes(task.intent)) stop('EXECUTION_INTENT_DENIED');
    const peer = byPeer.get(safeId(task.peer, 'INVALID_TASK_PEER'));
    if (!peer) stop('UNKNOWN_PEER');
    const capability = safeId(task.capability, 'INVALID_CAPABILITY');
    if (!peer.capabilities.includes(capability)) stop('CAPABILITY_NOT_DECLARED');
    const deps = scopes(task.deps || []);
    const read = scopes(task.read || []);
    const write = scopes(task.proposed_write || []);
    if (task.intent === 'READ' && write.length) stop('READ_TASK_CANNOT_PROPOSE_WRITES');
    if (write.some(path => path === 'CURRENT_POINTER' || path === 'PRODUCTION' || path === 'CLOUDFLARE'))
      stop('PROTECTED_TARGET_DENIED');
    jobsById.set(id, Object.freeze({id,peer:peer.id,capability,requires:deps,read,proposed_write:write,intent:task.intent,evidence_level:peer.evidence.level}));
  }
  for (const task of jobsById.values()) for(const dep of task.requires) {
    if (!jobsById.has(dep) || dep === task.id) stop('INVALID_DEPENDENCY');
  }
  const pending = new Map(jobsById), done = new Set(), waves = [];
  while (pending.size) {
    const candidates = sorted([...pending.keys()]).map(id => pending.get(id)).filter(t => t.requires.every(d => done.has(d)));
    if (!candidates.length) stop('DEPENDENCY_CYCLE');
    const wave = [], proposedWrites = [], activeReads = [];
    for (const task of candidates) {
      // Prevent overlapping write proposals and read-vs-proposal hazards even in a plan.
      if (intersect(task.proposed_write, proposedWrites) || intersect(task.proposed_write, activeReads) || intersect(task.read, proposedWrites)) continue;
      wave.push(task); proposedWrites.push(...task.proposed_write); activeReads.push(...task.read);
    }
    if (!wave.length) stop('WAVE_SCHEDULING_ERROR');
    waves.push(Object.freeze(wave));
    for (const task of wave) { pending.delete(task.id); done.add(task.id); }
  }
  const result = {
    schema: CONTRACT.schema,
    status: 'PLAN_READY_NOT_DISPATCHED',
    authority: CONTRACT.owner, project: CONTRACT.project,
    technical_lead: CONTRACT.technical_lead,
    local_executor: CONTRACT.local_executor,
    native_commit: current.commit,
    cost_state: 'ZERO_ADDITIONAL_COST_POLICY_ENFORCED_NO_ACTIONS',
    transfer_bridge: CONTRACT.canonical_transport,
    remote_operations: 0, production_writes: 0, foreign_writes: 0,
    waves: waves.map((items, index) => ({index: index + 1, tasks: items})),
    peer_evidence: peers.map(p => ({peer: p.id, ...p.evidence})),
    test_required: true,
    host_verified: false
  };
  result.fingerprint = fingerprint(result);
  return Object.freeze(result);
}

export function verifyPlan(plan, expectedCommit) {
  if (!object(plan) || plan.schema !== CONTRACT.schema || plan.status !== 'PLAN_READY_NOT_DISPATCHED') stop('INVALID_PLAN');
  if (!SHA.test(String(expectedCommit || '')) || plan.native_commit !== expectedCommit) stop('STALE_CURRENT_REVALIDATION_REQUIRED');
  const {fingerprint: hash, ...body} = plan;
  if (hash !== fingerprint(body)) stop('PLAN_FINGERPRINT_MISMATCH');
  if (plan.foreign_writes !== 0 || plan.production_writes !== 0 || plan.remote_operations !== 0 || plan.host_verified !== false) stop('PLAN_EVIDENCE_ESCALATION_DENIED');
  return Object.freeze({status:'PLAN_INTEGRITY_VERIFIED_NOT_EXECUTED', fingerprint: hash});
}
