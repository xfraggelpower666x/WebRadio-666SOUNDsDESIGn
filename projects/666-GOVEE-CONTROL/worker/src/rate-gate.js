// Gemeinsamer, accountweiter Govee-Grenzwächter (Durable Object, SQLite Storage).
// Absichtlich fail-closed, wenn der Durable-Object-Binding fehlt.
export class GoveeRateGate {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    if (request.method !== 'POST') return Response.json({ok:false,error:'method_not_allowed'},{status:405});
    let body;
    try { body = await request.json(); } catch { return Response.json({ok:false,error:'invalid_json'},{status:400}); }
    const sku=body?.sku, device=body?.device;
    if (typeof sku !== 'string' || !/^H[0-9A-Z]{4,10}$/.test(sku) || typeof device !== 'string' || !/^[0-9A-Fa-f:]{12,35}$/.test(device)) {
      return Response.json({ok:false,error:'invalid_device'},{status:400});
    }
    const key='device:'+sku+':'+device.toUpperCase(), now=Date.now();
    // Sliding-window entries: konservativ 2 Gerätesteuerungen/1s, 12 Accountsteuerungen/1s.
    const decision=await this.ctx.storage.transaction(async txn=>{
      const [account, perDevice]=await Promise.all([txn.get('account-window'),txn.get(key)]);
      const accountRecent=Array.isArray(account)?account.filter(t=>Number.isFinite(t)&&t>now-1000):[];
      const deviceRecent=Array.isArray(perDevice)?perDevice.filter(t=>Number.isFinite(t)&&t>now-1000):[];
      if (accountRecent.length>=12 || deviceRecent.length>=2) {
        const oldest=Math.min(accountRecent.length>=12?accountRecent[0]:Infinity,deviceRecent.length>=2?deviceRecent[0]:Infinity);
        return {ok:false,retryAfterMs:Math.max(100,1000-(now-oldest))};
      }
      accountRecent.push(now); deviceRecent.push(now);
      await txn.put('account-window',accountRecent); await txn.put(key,deviceRecent);
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
