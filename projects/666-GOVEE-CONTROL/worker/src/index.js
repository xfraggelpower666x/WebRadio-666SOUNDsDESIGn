import {mapAudioEvent} from './audio-mapping.js';
import {validateCapability} from './capability-validation.js';
// 666SOUNDsDESIGn native GOVEE CLOUD CONTROL. No client secrets.
const BASE='https://openapi.api.govee.com';
const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...H,...extra}});
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let v=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)v|=(x[i]||0)^(y[i]||0);return v===0;};
const cors=(req,env)=>{const o=req.headers.get('Origin');return o&&env.ALLOWED_ORIGIN&&o===env.ALLOWED_ORIGIN?{'access-control-allow-origin':o,'vary':'Origin','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'}:{};};
async function api(env,path,method='GET',body){
 const res=await fetch(BASE+path,{method,headers:{'Govee-API-Key':env.GOVEE_API_KEY,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const result=await res.json().catch(()=>null);
 if(!res.ok)return {ok:false,httpStatus:res.status,error:'Govee upstream error',upstreamCode:result?.code??null};
 return {ok:true,result};
}
const isSku=x=>typeof x==='string'&&/^H[0-9A-Z]{4,10}$/.test(x);
const isDevice=x=>typeof x==='string'&&/^[0-9A-Fa-f:]{12,35}$/.test(x);
const isType=x=>typeof x==='string'&&/^devices\.capabilities\.[a-z_]{2,60}$/.test(x);
const isInstance=x=>typeof x==='string'&&/^[a-zA-Z][a-zA-Z0-9_]{0,60}$/.test(x);
async function owned(env){
 const r=await api(env,'/router/api/v1/user/devices');if(!r.ok)return r;
 const devices=r.result?.data?.devices??r.result?.payload?.devices??[];
 return {ok:true,devices:Array.isArray(devices)?devices:[]};
}
const kinds=['devices.capabilities.on_off','devices.capabilities.range','devices.capabilities.color_setting','devices.capabilities.color_temperature'];
const goodCapability=c=>c&&isType(c.type)&&isInstance(c.instance)&&Object.hasOwn(c,'value')&&kinds.includes(c.type);
async function control(env,m,c){
 return api(env,'/router/api/v1/device/control','POST',{requestId:crypto.randomUUID(),payload:{sku:m.sku,device:m.device,capability:{type:c.type,instance:c.instance,value:c.value}}});
}
export default {async fetch(request,env){
 const u=new URL(request.url),headers=cors(request,env),reply=(b,s=200)=>json(b,s,headers);
 if(request.method==='OPTIONS')return Object.keys(headers).length?new Response(null,{status:204,headers}):reply({ok:false,error:'Origin not permitted'},403);
 if(u.pathname==='/health'&&request.method==='GET')return reply({ok:true,service:'666-govee-worker',version:'0.3-source',configured:!!env.GOVEE_API_KEY,locked:!env.CONTROL_TOKEN});
 if(!env.GOVEE_API_KEY||!env.CONTROL_TOKEN)return reply({ok:false,error:'Required secrets not configured'},503);
 if(!equal(request.headers.get('Authorization')||'','Bearer '+env.CONTROL_TOKEN))return reply({ok:false,error:'Unauthorized'},401);
 try{
  if(u.pathname==='/api/devices'&&request.method==='GET'){
   const r=await owned(env);if(!r.ok)return reply(r,502);
   return reply({ok:true,devices:r.devices.map(d=>({sku:d.sku,device:d.device,deviceName:d.deviceName,capabilities:d.capabilities}))});
  }
  if(u.pathname==='/api/state'&&request.method==='POST'){
   const b=await request.json().catch(()=>null);
   if(!b||!isSku(b.sku)||!isDevice(b.device))return reply({ok:false,error:'Invalid device identification'},400);
   const r=await owned(env);if(!r.ok)return reply(r,502);
   if(!r.devices.some(d=>d.sku===b.sku&&d.device===b.device))return reply({ok:false,error:'Device not registered to account'},403);
   const s=await api(env,'/router/api/v1/device/state','POST',{requestId:crypto.randomUUID(),payload:{sku:b.sku,device:b.device}});
   return reply(s,s.ok?200:502);
  }
  if(u.pathname==='/api/control'&&request.method==='POST'){
   const b=await request.json().catch(()=>null),c=b?.capability;
   if(!b||!isSku(b.sku)||!isDevice(b.device)||!goodCapability(c))return reply({ok:false,error:'Invalid control payload'},400);
   const r=await owned(env);if(!r.ok)return reply(r,502);
   const d=r.devices.find(x=>x.sku===b.sku&&x.device===b.device);
   if(!d)return reply({ok:false,error:'Device not registered to account'},403);
   if(!validateCapability(d,c))return reply({ok:false,error:'Capability or value not supported by device'},400);
   const x=await control(env,b,c);return reply(x,x.ok?200:502);
  }
  if(u.pathname==='/api/audio/preview'&&request.method==='POST'){
   const b=await request.json().catch(()=>null);
   if(!b||typeof b!=='object'||Array.isArray(b))return reply({ok:false,error:'Invalid audio event'},400);
   return reply({ok:true,preview:mapAudioEvent(b),executed:false});
  }
  if(u.pathname==='/api/groups/control'&&request.method==='POST'){
   const b=await request.json().catch(()=>null),members=b?.members,c=b?.capability;
   if(!Array.isArray(members)||members.length<1||members.length>8||!goodCapability(c))return reply({ok:false,error:'Invalid group payload'},400);
   if(members.some(m=>!m||!isSku(m.sku)||!isDevice(m.device)))return reply({ok:false,error:'Invalid group member'},400);
   if(new Set(members.map(m=>m.sku+'|'+m.device)).size!==members.length)return reply({ok:false,error:'Duplicate group members'},400);
   const r=await owned(env);if(!r.ok)return reply(r,502);
   const devices=members.map(m=>r.devices.find(x=>x.sku===m.sku&&x.device===m.device));
   if(devices.some(d=>!d))return reply({ok:false,error:'Group contains a device not registered to account'},403);
   const results=[];
   for(let i=0;i<members.length;i++){
    const m=members[i],d=devices[i];
    if(!validateCapability(d,c)){results.push({sku:m.sku,device:m.device,ok:false,error:'Capability or value not supported'});continue;}
    const x=await control(env,m,c);results.push({sku:m.sku,device:m.device,ok:x.ok,upstreamStatus:x.httpStatus??null});
   }
   const ok=results.every(x=>x.ok);return reply({ok,results,executed:results.filter(x=>x.ok).length},ok?200:207);
  }
  return reply({ok:false,error:'Not found'},404);
 }catch(_){return reply({ok:false,error:'Request failed'},500);}
}};
