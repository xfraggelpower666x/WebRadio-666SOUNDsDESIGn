import test from 'node:test';
import assert from 'node:assert/strict';
import {GoveeRateGate,getCachedGoveeDevices} from '../src/rate-gate.js';
function memory(){const map=new Map();return {get:async k=>map.get(k),put:async(k,v)=>map.set(k,v),delete:async k=>map.delete(k),transaction:async fn=>fn({get:async k=>map.get(k),put:async(k,v)=>map.set(k,v)})};}
const D={sku:'H6047',device:'60:74:F4:40:D9:A2',capabilities:[]};
test('first real module catalog fetch is cached on repeated DO calls',async()=>{
 let calls=0;const old=globalThis.fetch;globalThis.fetch=async()=>{calls++;return Response.json({code:200,data:[D]});};
 try{const gate=new GoveeRateGate({storage:memory()},{GOVEE_API_KEY:'test-only'});const a=await gate.fetch(new Request('https://gate.internal/devices'));const b=await gate.fetch(new Request('https://gate.internal/devices'));assert.equal(a.status,200);assert.equal(b.status,200);assert.equal(calls,1);assert.equal((await b.json()).cached,true);}finally{globalThis.fetch=old;}
});
test('simultaneous catalog requests single-flight',async()=>{
 let calls=0;const old=globalThis.fetch;globalThis.fetch=async()=>{calls++;await new Promise(r=>setTimeout(r,10));return Response.json({code:200,data:[D]});};
 try{const gate=new GoveeRateGate({storage:memory()},{GOVEE_API_KEY:'test-only'});const [a,b,c]=await Promise.all([gate.getCatalog(),gate.getCatalog(),gate.getCatalog()]);assert.equal(a.ok,true);assert.equal(b.ok,true);assert.equal(c.ok,true);assert.equal(calls,1);}finally{globalThis.fetch=old;}
});
test('catalog upstream 429 then backoff prevents retry loop',async()=>{
 let calls=0;const old=globalThis.fetch;globalThis.fetch=async()=>{calls++;return Response.json({code:429},{status:429});};
 try{const gate=new GoveeRateGate({storage:memory()},{GOVEE_API_KEY:'test-only'});const a=await gate.fetch(new Request('https://gate.internal/devices'));assert.equal(a.status,429);const b=await gate.fetch(new Request('https://gate.internal/devices'));assert.equal(b.status,503);assert.equal(calls,1);}finally{globalThis.fetch=old;}
});
test('central catalog wrapper missing binding fails closed',async()=>{assert.equal((await getCachedGoveeDevices({})).ok,false);});
