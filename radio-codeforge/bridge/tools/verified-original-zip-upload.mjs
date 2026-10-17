#!/usr/bin/env node
// Repair adapter for existing 666STREAM-CODEFORGE-ARTIFACT-BRIDGE.
// This is NOT a second bridge. Dry-run by default. Only isolated test ref allowed.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename,resolve} from 'node:path';

const repo='xfraggelpower666x/WebRadio-666SOUNDsDESIGn';
const branch='test/codeforge-full-original-govee-fx-20261017';
const target='projects/666-GOVEE-CONTROL/bridge-tests/2026-10-17/GOVEE_FX_SCENE_SYNC_ADDON.zip';
const expected={size:9123,sha256:'2692989cf391c17fd2afb53065763289c2b622d272877c4b9cdc722bb3b26834',gitBlob:'9a75b296c05b066efe1ad26680a774e2c41a36e4'};
const input=process.argv.find(v=>v.startsWith('--file='))?.slice(7);
const execute=process.argv.includes('--execute');
if(!input) throw Error('Provide --file=/absolute/path/GOVEE_FX_SCENE_SYNC_ADDON.zip');
if(basename(input)!=='GOVEE_FX_SCENE_SYNC_ADDON.zip') throw Error('Original archive filename required');
const data=readFileSync(resolve(input));
const hash=x=>createHash('sha256').update(x).digest('hex');
const blobSha=x=>createHash('sha1').update(Buffer.from('blob '+x.length+'\0','utf8')).update(x).digest('hex');
const manifest={bridge:'666STREAM-CODEFORGE-ARTIFACT-BRIDGE',repo,branch,target,size:data.length,sha256:hash(data),git_blob_sha:blobSha(data),mode:execute?'ISOLATED_TEST_UPLOAD':'DRY_RUN'};
if(data.length!==expected.size||manifest.sha256!==expected.sha256||manifest.git_blob_sha!==expected.gitBlob) throw Error('SOURCE_ORIGINAL_MISMATCH: '+JSON.stringify(manifest));
if(!execute){console.log(JSON.stringify({...manifest,status:'SOURCE_PRECHECK_PASS_NO_REMOTE_WRITE'},null,2));process.exit(0);}
const token=process.env.GITHUB_TOKEN;
if(!token) throw Error('GITHUB_TOKEN required in --execute mode; never put credentials in files or command arguments');
const api='https://api.github.com/repos/'+repo;
async function gh(method,url,body){
 const response=await fetch(api+url,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const raw=await response.text();let obj;try{obj=JSON.parse(raw)}catch{obj={message:raw.slice(0,400)}}
 if(!response.ok)throw Error('GitHub '+method+' HTTP '+response.status+': '+String(obj.message).slice(0,180));
 return obj;
}
const refPath='/git/ref/heads/'+branch.split('/').map(encodeURIComponent).join('/');
const getRef=()=>gh('GET',refPath);
const initial=await getRef();
const parent=initial.object.sha;
const parentCommit=await gh('GET','/git/commits/'+parent);
if(!parentCommit.tree?.sha) throw Error('Missing parent tree');
const created=await gh('POST','/git/blobs',{content:data.toString('base64'),encoding:'base64'});
if(created.sha!==expected.gitBlob) throw Error('STOP: UPLOAD_GIT_BLOB_MISMATCH expected='+expected.gitBlob+' actual='+created.sha);
const remoteBlob=await gh('GET','/git/blobs/'+created.sha);
if(remoteBlob.encoding!=='base64') throw Error('STOP: GitHub did not return base64 blob');
const received=Buffer.from(remoteBlob.content.replace(/\s/g,''),'base64');
if(received.length!==expected.size||hash(received)!==expected.sha256||blobSha(received)!==expected.gitBlob||!received.equals(data))throw Error('STOP: INDEPENDENT_GITHUB_BLOB_BYTE_READBACK_MISMATCH');
const tree=await gh('POST','/git/trees',{base_tree:parentCommit.tree.sha,tree:[{path:target,mode:'100644',type:'blob',sha:created.sha}]});
const commit=await gh('POST','/git/commits',{message:'test(codeforge): verified full original Govee ZIP bytes on isolated branch',tree:tree.sha,parents:[parent]});
if((await getRef()).object.sha!==parent)throw Error('STOP: CONCURRENT_BRANCH_UPDATE');
await gh('PATCH',refPath,{sha:commit.sha,force:false});
if((await getRef()).object.sha!==commit.sha)throw Error('STOP: REMOTE_REF_READBACK_MISMATCH');
const file=await gh('GET','/contents/'+target.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(branch));
const final=Buffer.from(String(file.content||'').replace(/\s/g,''),'base64');
if(final.length!==expected.size||hash(final)!==expected.sha256||!final.equals(data))throw Error('STOP: FINAL_BRANCH_FILE_BYTE_READBACK_MISMATCH');
console.log(JSON.stringify({...manifest,status:'PASS_EXACT_REMOTE_BYTES_AND_SHA256',commit:commit.sha,remote_git_blob_sha:created.sha,final_size:final.length,branch_readback:true,production_branch_mutated:false},null,2));
