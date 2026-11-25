/**
 * 666STREAM R03: exact-commit GitHub source reader for a user-supplied host tool.
 * This module has no network client, tokens, action runner, or write capability.
 * A host MUST inject explicitly authorized fetchFile/fetchBlob handles.
 * Git object integrity is independently checked against the provider response.
 */
import { createHash } from 'node:crypto';
import { createBindingRegistry } from './peer-executor.mjs';

const hex40 = v => typeof v === 'string' && /^[a-f0-9]{40}$/i.test(v);
const repoId = v => typeof v === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(v);
const pathId = v => typeof v === 'string' && v.length > 0 && v.length <= 512 && !v.startsWith('/') && !v.includes('\\') && !v.split('/').some(x=>x === '' || x === '.' || x === '..') && !/[\r\n\0]/.test(v);
const err = code => Object.assign(new Error(code), {code});
const gitBlobSha = text => {
  const raw=Buffer.from(text,'utf8');
  return createHash('sha1').update(Buffer.from(`blob ${raw.byteLength}\0`)).update(raw).digest('hex');
};

/**
 * sourceMap keyed by task read scope: {repo,commit,path,blobSha}; no dynamic paths.
 * Host tool handles are injected, not discovered or constructed here.
 * Provider receipts are not proof of zero billing or peer/plugin execution.
 */
export function githubReadOnlyBinding({peer,capability,sourceMap,nativeCommit,host,approvedRepositories,hostActionReceipt}={}) {
  if (!hex40(nativeCommit) || !sourceMap || typeof sourceMap !== 'object' || Array.isArray(sourceMap)) throw err('SOURCE_CONFIG_INVALID');
  if (!host || typeof host.fetchFile !== 'function' || typeof host.fetchBlob !== 'function') throw err('HOST_TOOL_HANDLE_MISSING');
  if (!Array.isArray(approvedRepositories) || approvedRepositories.length === 0 || !approvedRepositories.every(repoId)) throw err('REPO_ALLOWLIST_REQUIRED');
  if (!hostActionReceipt || hostActionReceipt.authorized !== true || hostActionReceipt.readOnly !== true || hostActionReceipt.newPaidResources === true) throw err('HOST_AUTHORIZATION_REQUIRED');
  const scopes=Object.keys(sourceMap);
  if (!scopes.length) throw err('EMPTY_READ_SCOPE');
  const allow = new Set(approvedRepositories);
  const pinned = Object.create(null);
  for (const key of scopes) {
    const item=sourceMap[key];
    if (!item || !repoId(item.repo) || !allow.has(item.repo) || !hex40(item.commit) || !hex40(item.blobSha) || !pathId(item.path)) throw err('UNAPPROVED_SOURCE');
    pinned[key]=Object.freeze({...item});
  }
  return Object.freeze({
    peer,capability,action:'GITHUB_EXACT_COMMIT_BLOB_READ',mode:'READ_ONLY',cost:'VERIFIED_ZERO_EUR_NO_PAID_CREDITS',
    readScopes:scopes,localOnly:false,peerHostVerified:false,
    evidence:Object.freeze({provider:'GITHUB_HOST_INJECTED',hostActionReceipt,sourceCount:scopes.length}),
    invoke:async ({task,signal})=>{
      if (signal?.aborted) throw err('ABORTED');
      if (task.nativeCommit!==nativeCommit) throw err('STALE_NATIVE_COMMIT');
      const records=[];
      for (const scope of task.read) {
        const item=pinned[scope];
        if (!item) throw err('READ_SCOPE_DENIED');
        if (signal?.aborted) throw err('ABORTED');
        const response=await host.fetchFile({repository_full_name:item.repo,path:item.path,ref:item.commit});
        if (!response || response.git_lfs_pointer===true || response.encoding!=='utf-8' || typeof response.content!=='string' || response.sha!==item.blobSha) throw err('FILE_READBACK_MISMATCH');
        if (gitBlobSha(response.content)!==item.blobSha) throw err('GIT_BLOB_INTEGRITY_MISMATCH');
        const independent=await host.fetchBlob({repository_full_name:item.repo,blob_sha:item.blobSha});
        if (!independent || typeof independent.content!=='string' || independent.content!==response.content || gitBlobSha(independent.content)!==item.blobSha) throw err('INDEPENDENT_BLOB_MISMATCH');
        records.push({scope,repo:item.repo,commit:item.commit,path:item.path,blobSha:item.blobSha,sha256:createHash('sha256').update(response.content).digest('hex')});
      }
      return {operation:'READ_ONLY',taskId:task.id,nativeCommit,mutated:false,paidCreditConsumed:false,additionalCostEur:0,peerHostVerified:false,output:JSON.stringify({schema:'666STREAM_GITHUB_READBACK_R03',files:records})};
    }
  });
}

export function githubBindingRegistry(configurations) {
  if (!Array.isArray(configurations)) throw err('INVALID_BINDING_ARRAY');
  return createBindingRegistry(configurations.map(githubReadOnlyBinding));
}