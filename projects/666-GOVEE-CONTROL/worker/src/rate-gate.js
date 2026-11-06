// Gemeinsamer, accountweiter Govee-Grenzwächter (Durable Object, SQLite Storage).
// Absichtlich fail-closed, wenn der Durable-Object-Binding fehlt.
export class GoveeRateGate {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.catalogRequest = null; }
  async getCatalog() {
    const now=Date.now();
    const cache=await this.ctx.storage.get('govee-device-catalog');
    if(cache && cache.expires>now && Array.isArray(cache.devices))return {ok:true,devices:cache.devices,cached:true};
    const retry=await this.ctx.storage.get('govee-catalog-retry-after');
    if(retry && retry>now)return {ok:false,error:'catalog_retry_pending',retryAfterMs:retry-now};
    if(!this.env?.GOVEE_API_KEY)return {ok:false,error:'govee_api_key_missing'};
    if(!this.catalogRequest){
      this.catalogRequest=(async()=>{
        // Backoff is written before the upstream call to prevent retry storms.
        await this.ctx.storage.put('govee-catalog-retry-after',Date.now()+15000);
        const response=await fetch('https://openapi.api.govee.com/router/api/v1/user/devices',{headers:{'Govee-API-Key':this.env.GOVEE_API_KEY}});
        const payload=await response.json().catch(()=>null);
        const raw=Array.isArray(payload?.data)?payload.data:payload?.data?.devices;
        if(!response.ok || payload?.code!==200 || !Array.isArray(raw))return {ok:false,error:response.status===429?'upstream_rate_limited':'catalog_unavailable',httpStatus:response.status===429?429:503};
        // Cache only necessary fields, never API secrets.
        const devices=raw.map(d=>({sku:d.sku,device:d.device,deviceName:d.deviceName,capabilities:d.capabilities})).filter(d=>typeof d.sku==='string'&&typeof d.device==='string');
        await this.ctx.storage.put('govee-device-catalog',{expires:Date.now()+60000,devices});
        await this.ctx.storage.delete('govee-catalog-retry-after');
        return {ok:true,devices,cached:false};
      })().catch(()=>({ok:false,error:'catalog_unavailable'})).finally(()=>{this.catalogRequest=null;});
    }
    return this.catalogRequest;
  }
  async fetch(request) {
    if (new URL(request.url).pathname==='/devices') {
      if(request.method!=='GET')return Response.json({ok:false,error:'method_not_allowed'},{status:405});
      const result=await this.getCatalog();
      return Response.json(result,{status:result.ok?200:result.httpStatus??503});
    }
    if (request.method !== 'POST') return Response.json({ok:false,error:'method_not_allowed'},{status:405});
    let body;
    try { body = await request.json(); } catch { return Response.json({ok:false,error:'invalid_json'},{status:400}); }
    const sku=body?.sku, device=body?.device;
    if (typeof sku !== 'string' || !/^H[0-9A-Z]{4,10}$/.test(sku) || typeof device !== 'string' || !/^[0-9A-Fa-f:]{12,35}$/.test(device)) {
      return Response.json({ok:false,error:'invalid_device'},{status:400});
    }
    const isState=new URL(request.url).pathname==='/reserve-state';
    if(new URL(request.url).pathname!=='/reserve' && !isState)return Response.json({ok:false,error:'unknown_gate_route'},{status:404});
    const key=(isState?'state:':'device:')+sku+':'+device.toUpperCase(), now=Date.now();
    // Sliding-window entries: konservativ 2 Gerätesteuerungen/1s, 12 Accountsteuerungen/1s.
    const decision=await this.ctx.storage.transaction(async txn=>{
      const account=isState?[]:await txn.get('account-window');
      const perDevice=await txn.get(key);
      const windowMs=isState?60000:1000;
      const deviceMax=isState?30:2;
      const accountRecent=Array.isArray(account)?account.filter(t=>Number.isFinite(t)&&t>now-1000):[];
      const deviceRecent=Array.isArray(perDevice)?perDevice.filter(t=>Number.isFinite(t)&&t>now-windowMs):[];
      if ((!isState&&accountRecent.length>=12) || deviceRecent.length>=deviceMax) {
        const oldest=Math.min(!isState&&accountRecent.length>=12?accountRecent[0]:Infinity,deviceRecent.length>=deviceMax?deviceRecent[0]:Infinity);
        return {ok:false,retryAfterMs:Math.max(100,windowMs-(now-oldest))};
      }
      if(!isState){accountRecent.push(now);await txn.put('account-window',accountRecent);}
      deviceRecent.push(now);await txn.put(key,deviceRecent);
      return {ok:true};
    });
    return Response.json(decision,{status:decision.ok?200:429,headers:decision.ok?{}:{'Retry-After':String(Math.ceil(decision.retryAfterMs/1000))}});
  }
}
export async function reserveGoveeControl(env,sku,device){
  if(!env?.GOVEE_RATE_GATE || typeof env.GOVEE_RATE_GATE.idFromName!=='function') return {ok:false,error:'rate_gate_unavailable'};
  try{
    const stub=env.GOVEE_RATE_GATE.get(env.GOVEE_RATE_GATE.idFromName('govee-account-control-v1'));
    const response=await stub.fetch('https://gate.internal/reserve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku,device})});
    const data=await response.json().catch(()=>null);
    return response.ok&&data?.ok?{ok:true}:{ok:false,error:response.status===429?'rate_limited':'rate_gate_error',retryAfterMs:data?.retryAfterMs??null};
  }catch{return {ok:false,error:'rate_gate_unavailable'};}
}

export async function getCachedGoveeDevices(env){
  if(!env?.GOVEE_RATE_GATE || typeof env.GOVEE_RATE_GATE.idFromName!=='function')return {ok:false,error:'rate_gate_unavailable'};
  try{
    const stub=env.GOVEE_RATE_GATE.get(env.GOVEE_RATE_GATE.idFromName('govee-account-control-v1'));
    const response=await stub.fetch('https://gate.internal/devices',{method:'GET'});
    const result=await response.json().catch(()=>null);
    return response.ok&&result?.ok&&Array.isArray(result.devices)?{ok:true,devices:result.devices}:{ok:false,error:result?.error??'catalog_unavailable',httpStatus:response.status};
  }catch{return {ok:false,error:'catalog_unavailable'};}
}

export async function reserveGoveeState(env,sku,device){
  if(!env?.GOVEE_RATE_GATE || typeof env.GOVEE_RATE_GATE.idFromName!=='function')return {ok:false,error:'rate_gate_unavailable'};
  try{
    const stub=env.GOVEE_RATE_GATE.get(env.GOVEE_RATE_GATE.idFromName('govee-account-control-v1'));
    const response=await stub.fetch('https://gate.internal/reserve-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku,device})});
    const data=await response.json().catch(()=>null);
    return response.ok&&data?.ok?{ok:true}:{ok:false,error:response.status===429?'rate_limited':'rate_gate_error',retryAfterMs:data?.retryAfterMs??null};
  }catch{return {ok:false,error:'rate_gate_unavailable'};}
}
