import test from 'node:test';
import assert from 'node:assert/strict';
import {GoveeRateGate,reserveGoveeControl} from '../src/rate-gate.js';
class Store {
 constructor(){this.map=new Map();}
 async transaction(fn){return fn({get:async k=>this.map.get(k),put:async(k,v)=>this.map.set(k,v)});}
}
const makeGate=()=>new GoveeRateGate({storage:new Store()});
const device=(sku,mac)=>new Request('https://gate.internal/reserve',{method:'POST',body:JSON.stringify({sku,device:mac})});
test('same device: third command in 1 second is rejected',async()=>{
 const gate=makeGate(),req=()=>device('H6047','60:74:F4:40:D9:A2');
 assert.equal((await gate.fetch(req())).status,200);
 assert.equal((await gate.fetch(req())).status,200);
 const r=await gate.fetch(req());assert.equal(r.status,429);assert.ok(Number(r.headers.get('Retry-After'))>=1);
});
test('different devices keep separate device windows',async()=>{
 const gate=makeGate();
 for(let i=0;i<2;i++)assert.equal((await gate.fetch(device('H6047','60:74:F4:40:D9:A2'))).status,200);
 assert.equal((await gate.fetch(device('H6198','60:74:F4:40:D9:A3'))).status,200);
});
test('account-wide 12 requests per second are enforced',async()=>{
 const gate=makeGate();
 for(let i=0;i<12;i++){
  const mac='60:74:F4:40:D9:'+i.toString(16).toUpperCase().padStart(2,'0');
  assert.equal((await gate.fetch(device('H6047',mac))).status,200);
 }
 assert.equal((await gate.fetch(device('H6047','60:74:F4:40:DA:99'))).status,429);
});
test('missing rate gate binding fails closed',async()=>assert.deepEqual(await reserveGoveeControl({},'H6047','60:74:F4:40:D9:A2'),{ok:false,error:'rate_gate_unavailable'}));
test('invalid device ID does not consume quota',async()=>{
 const gate=makeGate();assert.equal((await gate.fetch(device('H6047','bad!'))).status,400);
 assert.equal((await gate.fetch(device('H6047','60:74:F4:40:D9:A2'))).status,200);
});

test('device state is limited to 30 requests/minute without consuming control quota',async()=>{
 const gate=makeGate(),mac='60:74:F4:40:D9:A2';
 const request=()=>new Request('https://gate.internal/reserve-state',{method:'POST',body:JSON.stringify({sku:'H6047',device:mac})});
 for(let i=0;i<30;i++)assert.equal((await gate.fetch(request())).status,200);
 const denied=await gate.fetch(request());assert.equal(denied.status,429);
 assert.ok(Number(denied.headers.get('Retry-After'))>=1);
 assert.equal((await gate.fetch(device('H6047',mac))).status,200);
});
test('unknown rate gate route rejects before consuming quota',async()=>{
 const gate=makeGate(),mac='60:74:F4:40:D9:A2';
 const wrong=new Request('https://gate.internal/not-reserve',{method:'POST',body:JSON.stringify({sku:'H6047',device:mac})});
 assert.equal((await gate.fetch(wrong)).status,404);
 assert.equal((await gate.fetch(device('H6047',mac))).status,200);
});
