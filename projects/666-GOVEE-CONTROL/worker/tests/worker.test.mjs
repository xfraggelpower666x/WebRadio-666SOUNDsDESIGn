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
test('catalog reads the official API without a rate gate, while commands stay blocked',async t=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls.push(new URL(url).pathname);
  assert.equal(options.headers['Govee-API-Key'],env.GOVEE_API_KEY);
  return Response.json({code:200,data:[
   {sku:'H6047',device:'AA:AA:AA:AA:AA:AA'},
   {sku:'H6198',device:'BB:BB:BB:BB:BB:BB'},null
  ]});
 });
 const request=new Request('https://example.invalid/api/devices?area=tv',{
  headers:{Authorization:'Bearer '+env.CONTROL_TOKEN}
 });
 const result=await worker.fetch(request,env);
 assert.equal(result.status,200);
 assert.deepEqual((await result.json()).devices.map(d=>d.sku),['H6198']);
 const member={sku:'H6047',device:'AA:AA:AA:AA:AA:AA'};
 const capability={type:'devices.capabilities.on_off',instance:'powerSwitch',value:1};
 for(const [route,body] of [['state',member],['control',{...member,capability}],['groups/control',{members:[member],capability}],['audio',{area:'bars',energy:0.6}]]){
  assert.equal((await worker.fetch(req('/api/'+route,body),env)).status,503);
 }
 assert.deepEqual(calls,['/router/api/v1/user/devices']);
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

test('body-level Govee rate limit becomes HTTP 429 instead of a false 200',async()=>{
 const old=globalThis.fetch;
 const d={sku:'H6047',device:'60:74:F4:40:D9:A2',capabilities:[{type:'devices.capabilities.on_off',instance:'powerSwitch'}]};
 const controlled={...env,GOVEE_RATE_GATE:{idFromName:()=> 'account',get:()=>({fetch:async(url)=>{
  return new URL(url).pathname==='/devices'?Response.json({ok:true,devices:[d]}):Response.json({ok:true});
 }})}};
 globalThis.fetch=async()=>Response.json({code:429,message:'Limit exceeded'},{status:200,headers:{'Retry-After':'12'}});
 try{
  const r=await worker.fetch(req('/api/control',{sku:d.sku,device:d.device,capability:{type:'devices.capabilities.on_off',instance:'powerSwitch',value:1}}),controlled);
  assert.equal(r.status,429);
  assert.equal(r.headers.get('Retry-After'),'12');
  assert.equal((await r.json()).ok,false);
 }finally{globalThis.fetch=old;}
});

test('state endpoint refuses upstream when central state quota is exhausted',async()=>{
 const old=globalThis.fetch,steps=[],d={sku:'H6047',device:'60:74:F4:40:D9:A2',capabilities:[]};
 const controlled={...env,GOVEE_RATE_GATE:{idFromName:()=> 'account',get:()=>({fetch:async(url)=>{
  const route=new URL(url).pathname;steps.push(route);
  return route==='/devices'?Response.json({ok:true,devices:[d]}):Response.json({ok:false,retryAfterMs:3000},{status:429});
 }})}};
 globalThis.fetch=async()=>{throw Error('No Govee request may follow rejected quota');};
 try{
  const r=await worker.fetch(req('/api/state',{sku:d.sku,device:d.device}),controlled);
  assert.equal(r.status,429);assert.equal((await r.json()).retryAfterMs,3000);
  assert.deepEqual(steps,['/devices','/reserve-state']);
 }finally{globalThis.fetch=old;}
});

test('authenticated device areas filter the catalog and preserve reported capabilities',async()=>{
 const devices=[
  {sku:'H6047',device:'AA:AA:AA:AA:AA:AA',capabilities:[{type:'devices.capabilities.range',instance:'brightness'}]},
  {sku:'H6198',device:'BB:BB:BB:BB:BB:BB',capabilities:[]},
  {sku:'H6000',device:'CC:CC:CC:CC:CC:CC',capabilities:[]}
 ];
 let catalogCalls=0;
 const scoped={...env,GOVEE_RATE_GATE:{idFromName:()=> 'account',get:()=>({fetch:async()=>{
  catalogCalls++;
  return Response.json({ok:true,devices});
 }})}};
 const list=(query='',token=env.CONTROL_TOKEN)=>worker.fetch(new Request(
  'https://example.invalid/api/devices'+query,{headers:{Authorization:'Bearer '+token}}
 ),scoped);
 assert.equal((await list('?area=tv','wrong')).status,401);
 assert.equal((await list('?area=other')).status,400);
 assert.equal(catalogCalls,0);
 for(const [query,expected] of [['',devices],['?area=bars',[devices[0]]],['?area=tv',[devices[1]]]]){
  const response=await list(query);
  assert.equal(response.status,200);
  assert.deepEqual((await response.json()).devices,expected);
 }
 assert.equal(catalogCalls,3);
});

const repairDevices=[
 {sku:'H6047',device:'AA:AA:AA:AA:AA:AA',capabilities:[{type:'devices.capabilities.on_off',instance:'powerSwitch'}]},
 {sku:'H6198',device:'BB:BB:BB:BB:BB:BB',capabilities:[{type:'devices.capabilities.on_off',instance:'powerSwitch'}]}
];
const power={type:'devices.capabilities.on_off',instance:'powerSwitch',value:1};
function repairEnv(reserve=()=>Response.json({ok:true})){
 return {...env,ALLOWED_ORIGIN:'https://client.example',GOVEE_RATE_GATE:{idFromName:()=> 'account',get:()=>({fetch:async url=>
  new URL(url).pathname==='/devices'?Response.json({ok:true,devices:repairDevices}):reserve()
 })}};
}

test('malformed Govee success response cannot acknowledge a command',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('<html>upstream maintenance</html>'));
 const response=await worker.fetch(req('/api/control',{...repairDevices[0],capability:power}),repairEnv());
 assert.equal(response.status,502);
 assert.equal((await response.json()).ok,false);
});

test('group keeps confirmed results when a later request loses the Govee connection',async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{
  if(++calls===2)throw new TypeError('network failure');
  return Response.json({code:200});
 });
 const response=await worker.fetch(req('/api/groups/control',{members:repairDevices,capability:power}),repairEnv());
 assert.equal(response.status,207);
 const result=await response.json();
 assert.equal(result.executed,1);
 assert.deepEqual(result.results.map(item=>item.ok),[true,false]);
 assert.equal(result.results[1].upstreamStatus,502);
});

test('rate limit retry time is visible to browser clients and group members',async t=>{
 const quota=repairEnv(()=>Response.json({ok:false,retryAfterMs:1501},{status:429}));
 t.mock.method(globalThis,'fetch',async()=>assert.fail('Rejected quota must not reach Govee'));
 for(const path of ['/api/control','/api/state']){
  const request=new Request(req(path,{...repairDevices[0],capability:power}),{headers:{
   Authorization:'Bearer '+env.CONTROL_TOKEN,Origin:quota.ALLOWED_ORIGIN
  }});
  const response=await worker.fetch(request,quota);
  assert.equal(response.status,429);
  assert.equal(response.headers.get('Retry-After'),'2');
  assert.equal(response.headers.get('Access-Control-Expose-Headers'),'Retry-After');
  assert.equal((await response.json()).retryAfterMs,1501);
 }
 const group=await worker.fetch(req('/api/groups/control',{members:repairDevices,capability:power}),quota);
 assert.equal(group.status,207);
 assert.deepEqual((await group.json()).results.map(item=>item.retryAfterMs),[1501,1501]);
});

test('live audio route applies only authorized, supported RGB to the selected area',async t=>{
 const rgb={type:'devices.capabilities.color_setting',instance:'colorRgb'};
 const devices=repairDevices.map(d=>({...d,capabilities:[rgb]}));
 const testEnv={...env,GOVEE_RATE_GATE:{idFromName:()=> 'account',get:()=>({fetch:async url=>
  new URL(url).pathname==='/devices'?Response.json({ok:true,devices}):Response.json({ok:true})
 })}};
 const calls=[];
 t.mock.method(globalThis,'fetch',async(_url,options)=>{
  calls.push(JSON.parse(options.body).payload);
  return Response.json({code:200});
 });
 const body={area:'bars',scene:'drop',theme:'cyan',energy:0.8};
 assert.equal((await worker.fetch(req('/api/audio',body,'wrong'),testEnv)).status,401);
 assert.equal((await worker.fetch(req('/api/audio',{...body,scene:'idle'},env.CONTROL_TOKEN),testEnv)).status,200);
 const result=await worker.fetch(req('/api/audio',body),testEnv);
 assert.equal(result.status,200);
 assert.equal((await result.json()).executed,1);
 assert.equal(calls.length,1);
 assert.equal(calls[0].sku,'H6047');
 assert.equal(calls[0].capability.value,0x00d2ff);
});

test('official Kelvin capability requires the advertised device range',()=>{
 const capability={type:'devices.capabilities.color_setting',instance:'colorTemperatureK'};
 const device={capabilities:[{...capability,parameters:{range:{min:2000,max:9000}}}]};
 assert.equal(validateCapability(device,{...capability,value:3000}),true);
 assert.equal(validateCapability(device,{...capability,value:1999}),false);
 assert.equal(validateCapability(device,{...capability,value:9001}),false);
 assert.equal(validateCapability(device,{...capability,value:3000.5}),false);
 assert.equal(validateCapability({capabilities:[capability]},{...capability,value:3000}),false);
});
