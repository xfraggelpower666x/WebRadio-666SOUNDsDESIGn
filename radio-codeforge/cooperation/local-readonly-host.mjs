/** Real local filesystem read-only host adapter for isolated acceptance tests.
 * Explicit per-scope path map; cannot access arbitrary paths from a task.
 */
import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createBindingRegistry } from './peer-executor.mjs';

export function localReadBinding({root,peer,capability,scopeFiles,nativeCommit}={}) {
  if (!root || !scopeFiles || typeof scopeFiles!=='object') throw Error('LOCAL_BINDING_CONFIG_REQUIRED');
  const rootPath=resolve(root);
  const names=Object.keys(scopeFiles);
  return {peer,capability,action:'READ_LOCAL_ALLOWLISTED_FILES',mode:'READ_ONLY',
    cost:'VERIFIED_ZERO_EUR_NO_PAID_CREDITS',localOnly:true,readScopes:names,
    invoke:async ({task})=>{
      if (task.nativeCommit!==nativeCommit) throw Object.assign(Error('stale'),{code:'STALE_COMMIT'});
      const realRoot=await realpath(rootPath);
      const output=[];
      for(const scope of task.read){
        if(!Object.hasOwn(scopeFiles,scope)) throw Object.assign(Error('scope'),{code:'SCOPE_DENIED'});
        const path=resolve(realRoot,scopeFiles[scope]);
        if(!path.startsWith(realRoot+sep)) throw Object.assign(Error('traversal'),{code:'PATH_OUTSIDE_ROOT'});
        const target=await realpath(path);
        if(!target.startsWith(realRoot+sep)) throw Object.assign(Error('symlink'),{code:'SYMLINK_OUTSIDE_ROOT'});
        const content=await readFile(target,'utf8');
        output.push({scope,relativePath:scopeFiles[scope],content});
      }
      return {operation:'READ_ONLY',taskId:task.id,nativeCommit,mutated:false,
        paidCreditConsumed:false,additionalCostEur:0,output:JSON.stringify(output)};
    }};
}

export {createBindingRegistry};
