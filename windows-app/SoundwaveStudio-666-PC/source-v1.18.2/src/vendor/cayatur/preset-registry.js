'use strict';
(function(){
  if(typeof window==='undefined')return;
  if(window.SVPresets&&typeof window.SVPresets.registerBuiltin==='function'&&typeof window.SVPresets.byKind==='function')return;
  const map=new Map();
  const normalize=p=>{
    if(!p||typeof p!=='object')throw new Error('preset_invalid');
    const id=String(p.id||'').trim();
    if(!id)throw new Error('preset_id_missing');
    return Object.freeze({...p,id,kind:String(p.kind||p.engine||'unknown')});
  };
  const upsert=(p,builtin=false)=>{
    const n=normalize({...p,builtin:!!(builtin||p.builtin)});
    map.set(n.id,n);
    return n;
  };
  window.SVPresets=Object.freeze({
    registerBuiltin(list){
      const arr=Array.isArray(list)?list:[list];
      for(const p of arr)upsert(p,true);
      return arr.length;
    },
    register(p){return upsert(p,false);},
    upsert(p){return upsert(p,!!p?.builtin);},
    remove(id){return map.delete(String(id||''));},
    get(id){return map.get(String(id||''))||null;},
    all(){return Array.from(map.values());},
    byKind(kind){const k=String(kind||'');return Array.from(map.values()).filter(p=>p.kind===k||p.engine===k);}
  });
})();