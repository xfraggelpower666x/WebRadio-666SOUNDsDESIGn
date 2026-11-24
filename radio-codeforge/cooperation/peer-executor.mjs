/**
 * 666STREAM development-only R02 executor. No external peer autoactivation.
 * Host capabilities must be explicitly provided as callable bindings.
 * Only read-only capabilities are accepted; a proposed write is a returned proposal.
 */
import { createHash } from 'node:crypto';
import { CONTRACT, CooperationError, verifyPlan } from './coop-core.mjs';

const stop = (code, msg) => { throw new CooperationError(code, msg); };
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const safeName = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(x);
const sha = x => typeof x === 'string' && /^[a-f0-9]{40}$/i.test(x);

/**
 * Binding fields: peer, capability, action, readScopes, invoke({task, evidence, signal}).
 * A binding represents a caller-supplied host capability. Binding presence is not proof
 * that a foreign plugin is installed, invoked or has validated its native authority.
 */
export function createBindingRegistry(bindings = []) {
  if (!Array.isArray(bindings)) stop('INVALID_BINDINGS');
  const map = new Map();
  for (const b of bindings) {
    if (!obj(b) || !safeName(b.peer) || !safeName(b.capability) || !safeName(b.action)) stop('INVALID_BINDING');
    if (typeof b.invoke !== 'function') stop('NO_EXECUTABLE_HOST_BINDING');
    if (b.mode !== 'READ_ONLY' || b.foreignWrite === true || b.deploy === true || b.allowPaid === true) stop('UNSAFE_BINDING_DENIED');
    if (!Array.isArray(b.readScopes) || b.readScopes.some(x => !safeName(x))) stop('INVALID_BINDING_SCOPE');
    if (b.cost !== 'VERIFIED_ZERO_EUR_NO_PAID_CREDITS') stop('COST_NOT_VERIFIED');
    const key = `${b.peer}:${b.capability}`;
    if (map.has(key)) stop('DUPLICATE_BINDING');
    map.set(key, Object.freeze({ peer:b.peer, capability:b.capability, action:b.action,
      readScopes:Object.freeze([...new Set(b.readScopes)]), invoke:b.invoke,
      evidence: obj(b.evidence) ? Object.freeze({...b.evidence}) : null,
      peerHostVerified:b.peerHostVerified === true,
      localOnly:b.localOnly === true }));
  }
  return map;
}

/** A real executable dispatcher, but entirely bounded to provided non-mutating hosts. */
export async function executePlan({plan, native, bindings, budget, maxParallel=3, signal}={}) {
  if (!obj(native) || native.project !== 'WEBRADIO' || native.authority !== CONTRACT.owner || !sha(native.commit)) stop('NATIVE_AUTHORITY_REQUIRED');
  verifyPlan(plan, native.commit);
  if (!obj(budget) || budget.zero_additional_eur !== true || budget.paid_credit_spend_allowed !== false || budget.external_operations_authorized === true) stop('COST_POLICY_REQUIRED');
  if (!Number.isSafeInteger(maxParallel) || maxParallel < 1 || maxParallel > 8) stop('PARALLEL_LIMIT_INVALID');
  if (signal?.aborted) stop('ABORTED');
  const registry = bindings instanceof Map ? bindings : createBindingRegistry(bindings);
  const all = plan.waves.flatMap(w => w.tasks);
  if (all.some(t => t.intent !== 'READ' && t.intent !== 'PROPOSE')) stop('UNSAFE_TASK_INTENT');
  const statuses = new Map();
  const receipts = [];
  const used = new Set();
  for (const wave of plan.waves) {
    const pending = [...wave.tasks];
    while (pending.length) {
      const group = pending.splice(0,maxParallel);
      const outcomes = await Promise.all(group.map(async task => {
        const key=`${task.peer}:${task.capability}`, binding=registry.get(key);
        if (!binding) return {task, status:'BLOCKED',code:'HOST_BINDING_MISSING'};
        if (!task.read.every(s=>binding.readScopes.includes(s))) return {task,status:'BLOCKED',code:'READ_SCOPE_DENIED'};
        if (!task.requires.every(id=>statuses.get(id)==='EXECUTED')) return {task,status:'BLOCKED',code:'DEPENDENCY_NOT_EXECUTED'};
        if (signal?.aborted) return {task,status:'BLOCKED',code:'ABORTED'};
        if (used.has(task.id)) return {task,status:'BLOCKED',code:'REPLAY_DENIED'};
        used.add(task.id);
        const input=Object.freeze({id:task.id,peer:task.peer,capability:task.capability,action:binding.action,
          project:'WEBRADIO',nativeCommit:native.commit,read:Object.freeze([...task.read]),
          intent:task.intent,proposedWrite:Object.freeze([...task.proposed_write]),
          dependencyReceipts:Object.freeze(task.requires.map(id=>statuses.get(id)))});
        try {
          // A host callback executes here, not a no-op planning operation.
          const response=await binding.invoke({task:input,evidence:binding.evidence,signal});
          if (!obj(response) || response.operation !== 'READ_ONLY' || response.mutated !== false ||
              response.paidCreditConsumed !== false || response.additionalCostEur !== 0)
            return {task,status:'BLOCKED',code:'UNSAFE_OR_INCOMPLETE_HOST_RECEIPT'};
          if (response.nativeCommit !== native.commit || response.taskId !== task.id)
            return {task,status:'BLOCKED',code:'HOST_RECEIPT_CONTEXT_MISMATCH'};
          if (typeof response.output !== 'string' || response.output.length > 100000)
            return {task,status:'BLOCKED',code:'OUTPUT_CONTRACT_DENIED'};
          // Only a reported result: not evidence of a remote peer's independent host verification.
          return {task,status:'EXECUTED',code:'READ_ONLY_HOST_CALLBACK_EXECUTED',
            outputSha256:createHash('sha256').update(response.output).digest('hex'),
            output:response.output,
            adapterType:binding.localOnly?'LOCAL_HOST_ADAPTER':'SUPPLIED_HOST_ADAPTER',
            peerHostVerified:binding.peerHostVerified && !binding.localOnly && response.peerHostVerified===true};
        } catch(e) { return {task,status:'BLOCKED',code:'HOST_CALLBACK_FAILED',errorCode:typeof e?.code==='string'?e.code:'HOST_ERROR'}; }
      }));
      for (const result of outcomes) {
        const {task,...details}=result;
        statuses.set(task.id,result.status);
        receipts.push(Object.freeze({taskId:task.id,peer:task.peer,capability:task.capability,
          intent:task.intent,proposedWrite:[...task.proposed_write], ...details}));
      }
    }
  }
  const blocked=receipts.filter(x=>x.status!=='EXECUTED').length;
  const report={schema:'666STREAM_CODEFORGE_EXECUTION_R02',authority:CONTRACT.owner,project:'WEBRADIO',
    sourcePlanFingerprint:plan.fingerprint,nativeCommit:native.commit,
    status:blocked?'PARTIAL':'EXECUTED_HOST_CALLBACKS',
    executed:receipts.length-blocked,blocked,productionWrites:0,foreignWrites:0,deployments:0,
    costClaim:'CALLBACK_RECEIPTS_ONLY_NOT_PROVIDER_BILLING_PROOF',
    nativeHostVerified:false,allPeersVerified:false,
    receipts};
  return Object.freeze({...report,reportSha256:hash(report)});
}
