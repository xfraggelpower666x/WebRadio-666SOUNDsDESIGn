import test from 'node:test';
import assert from 'node:assert/strict';
import {mapAudioEvent} from '../src/audio-mapping.js';
import {validateCapability} from '../src/capability-validation.js';
import worker from '../src/index.js';
const env={GOVEE_API_KEY:'test-placeholder',CONTROL_TOKEN:'test-token'};
const req=(path,body,token='test-token')=>new Request('https://example.invalid'+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('scene mapping preserves explicit drop and boosts bass',()=>{const x=mapAudioEvent({scene:'drop',bass:.4,energy:.8,playing:true});assert.equal(x.scene,'drop');assert.equal(x.drop,true);assert.ok(x.bass>0);});
test('capability allowlist accepts only advertised valid values',()=>{const d={capabilities:[{type:'devices.capabilities.on_off',instance:'powerSwitch'},{type:'devices.capabilities.range',instance:'brightness',parameters:{range:{min:1,max:100}}},{type:'devices.capabilities.color_setting',instance:'colorRgb'}]};assert.equal(validateCapability(d,{type:'devices.capabilities.on_off',instance:'powerSwitch',value:1}),true);assert.equal(validateCapability(d,{type:'devices.capabilities.on_off',instance:'powerSwitch',value:'1'}),false);assert.equal(validateCapability(d,{type:'devices.capabilities.range',instance:'brightness',value:101}),false);assert.equal(validateCapability(d,{type:'devices.capabilities.range',instance:'brightness',value:80}),true);assert.equal(validateCapability(d,{type:'devices.capabilities.color_setting',instance:'colorRgb',value:0x00ffcc}),true);});
test('unknown advertised range fails closed',()=>assert.equal(validateCapability({capabilities:[{type:'devices.capabilities.range',instance:'brightness'}]},{type:'devices.capabilities.range',instance:'brightness',value:20}),false));
test('audio dry-run authenticates and never invokes upstream',async()=>{const x=await worker.fetch(req('/api/audio/preview',{energy:.6,scene:'build'}),env);assert.equal(x.status,200);assert.equal((await x.json()).executed,false);});
test('group rejects duplicates before upstream',async()=>{const m={sku:'H6047',device:'60:74:F4:40:D9:A2'},x=await worker.fetch(req('/api/groups/control',{members:[m,m],capability:{type:'devices.capabilities.on_off',instance:'powerSwitch',value:1}}),env);assert.equal(x.status,400);});
test('missing secret locks protected endpoints',async()=>{const x=await worker.fetch(req('/api/audio/preview',{}),{});assert.equal(x.status,503);});

test('central catalog returns registered devices without direct Govee request',async()=>{
 let calls=0;
 const isolated={...env,GOVEE_RATE_GATE:{idFromName:()=> 'account',get:()=>({fetch:async(url)=>{
  calls++;
  assert.equal(new URL(url).pathname,'/devices');
  return Response.json({ok:true,devices:[{sku:'H6047',device:'60:74:F4:40:D9:A2',deviceName:'Bars',capabilities:[]}]});
 }})}};
 const result=await worker.fetch(new Request('https://example.invalid/api/devices',{headers:{Authorization:'Bearer test-token'}}),isolated);
 assert.equal(result.status,200);
 assert.equal((await result.json()).devices[0].sku,'H6047');
 assert.equal(calls,1);
});
test('central catalog rate limit is forwarded without an external request',async()=>{
 const isolated={...env,GOVEE_RATE_GATE:{idFromName:()=> 'account',get:()=>({fetch:async()=>Response.json({ok:false,error:'upstream_rate_limited'},{status:429})})}};
 const result=await worker.fetch(new Request('https://example.invalid/api/devices',{headers:{Authorization:'Bearer test-token'}}),isolated);
 assert.equal(result.status,429);
 assert.equal((await result.json()).ok,false);
});
test('missing gate fails closed even when API secret exists',async()=>{
 const result=await worker.fetch(new Request('https://example.invalid/api/devices',{headers:{Authorization:'Bearer test-token'}}),env);
 assert.equal(result.status,502);
});

test('valid device command reserves rate quota before calling upstream',async()=>{
 const old=globalThis.fetch,steps=[],device={sku:'H6047',device:'60:74:F4:40:D9:A2',capabilities:[{type:'devices.capabilities.on_off',instance:'powerSwitch'}]};
 const controlled={...env,GOVEE_RATE_GATE:{idFromName:()=> 'account',get:()=>({fetch:async(url)=>{
   const path=new URL(url).pathname;steps.push(path);
   return path==='/devices'?Response.json({ok:true,devices:[device]}):Response.json({ok:true});
 }})}};
 globalThis.fetch=async(url)=>{steps.push(new URL(url).pathname);return Response.json({code:200,data:{}});};
 try{
  const r=await worker.fetch(req('/api/control',{sku:device.sku,device:device.device,capability:{type:'devices.capabilities.on_off',instance:'powerSwitch',value:1}}),controlled);
  assert.equal(r.status,200);
  assert.deepEqual(steps,['/devices','/reserve','/router/api/v1/device/control']);
 }finally{globalThis.fetch=old;}
});
test('rejected rate gate cannot send any device command',async()=>{
 const old=globalThis.fetch,steps=[],device={sku:'H6047',device:'60:74:F4:40:D9:A2',capabilities:[{type:'devices.capabilities.on_off',instance:'powerSwitch'}]};
 const controlled={...env,GOVEE_RATE_GATE:{idFromName:()=> 'account',get:()=>({fetch:async(url)=>{
   const path=new URL(url).pathname;steps.push(path);
   return path==='/devices'?Response.json({ok:true,devices:[device]}):Response.json({ok:false,retryAfterMs:1000},{status:429});
 }})}};
 globalThis.fetch=async()=>{steps.push('FORBIDDEN_EXTERNAL_FETCH');throw Error('Unexpected API call');};
 try{
  const r=await worker.fetch(req('/api/control',{sku:device.sku,device:device.device,capability:{type:'devices.capabilities.on_off',instance:'powerSwitch',value:1}}),controlled);
  assert.equal(r.status,429);
  assert.deepEqual(steps,['/devices','/reserve']);
 }finally{globalThis.fetch=old;}
});
test('unadvertised capability is blocked before rate quota and external fetch',async()=>{
 const old=globalThis.fetch,steps=[],device={sku:'H6047',device:'60:74:F4:40:D9:A2',capabilities:[]};
 const controlled={...env,GOVEE_RATE_GATE:{idFromName:()=> 'account',get:()=>({fetch:async(url)=>{
   const path=new URL(url).pathname;steps.push(path);
   return Response.json({ok:true,devices:[device]});
 }})}};
 globalThis.fetch=async()=>{throw Error('Unexpected API call');};
 try{
  const r=await worker.fetch(req('/api/control',{sku:device.sku,device:device.device,capability:{type:'devices.capabilities.on_off',instance:'powerSwitch',value:1}}),controlled);
  assert.equal(r.status,400);
  assert.deepEqual(steps,['/devices']);
 }finally{globalThis.fetch=old;}
});
