/*
 * 666SOUNDsDESIGn — Canonical Browser Admin Auth Client v1.0.0
 * One session-only authentication instance for every protected player/admin action.
 */
(function(){
  'use strict';
  if(window.S666AdminAuth) return;

  var TOKEN_KEY='s666_admin_session_token_v1';
  var EXP_KEY='s666_admin_session_exp_v1';
  var checkCache={ok:false,at:0,pending:null};

  function readSession(key){try{return sessionStorage.getItem(key)||'';}catch(_){return '';}}
  function writeSession(key,value){try{if(value)sessionStorage.setItem(key,String(value));else sessionStorage.removeItem(key);}catch(_){}}
  function clear(){writeSession(TOKEN_KEY,'');writeSession(EXP_KEY,'');checkCache={ok:false,at:0,pending:null};}
  function token(){
    var value=readSession(TOKEN_KEY);
    var exp=Number(readSession(EXP_KEY)||0);
    if(!value)return '';
    if(exp&&exp<=Math.floor(Date.now()/1000)){clear();return '';}
    return value;
  }
  function sameOriginUrl(input){
    var raw=input instanceof Request?input.url:String(input||'');
    var url=new URL(raw,window.location.href);
    if(url.origin!==window.location.origin)throw new Error('cross_origin_admin_request_blocked');
    return url;
  }
  async function readJson(response){
    var text=await response.text();
    try{return JSON.parse(text);}catch(_){return{ok:false,error:'invalid_json_response',raw:text.slice(0,240)};}
  }
  async function login(password){
    var secret=String(password||'');
    if(!secret)return{ok:false,error:'password_rejected'};
    try{
      var response=await window.fetch('/api/admin/login',{
        method:'POST',
        credentials:'same-origin',
        cache:'no-store',
        headers:{'content-type':'application/json','accept':'application/json'},
        body:JSON.stringify({password:secret})
      });
      secret='';
      var data=await readJson(response);
      if(!response.ok||data.ok!==true||!data.token){clear();return{ok:false,error:data.error||'password_rejected',status:response.status};}
      var exp=Number(data.expiresAt||0);
      if(!Number.isFinite(exp)||exp<=Math.floor(Date.now()/1000)){clear();return{ok:false,error:'token_invalid'};}
      writeSession(TOKEN_KEY,data.token);
      writeSession(EXP_KEY,String(exp));
      checkCache={ok:true,at:Date.now(),pending:null};
      return{ok:true,expiresAt:exp,scope:data.scope,issuer:data.issuer,audience:data.audience};
    }catch(error){
      secret='';
      clear();
      return{ok:false,error:error&&error.message?error.message:'pw_login_unreachable'};
    }
  }
  async function check(force){
    var current=token();
    if(!current)return false;
    if(!force&&checkCache.ok&&Date.now()-checkCache.at<30000)return true;
    if(checkCache.pending&&!force)return checkCache.pending;
    checkCache.pending=(async function(){
      try{
        var response=await window.fetch('/api/admin/auth-check?t='+Date.now(),{
          method:'GET',
          credentials:'same-origin',
          cache:'no-store',
          headers:{'accept':'application/json','authorization':'Bearer '+current}
        });
        var data=await readJson(response);
        var ok=response.ok&&data.ok===true&&data.valid===true;
        if(!ok)clear();
        else checkCache={ok:true,at:Date.now(),pending:null};
        return ok;
      }catch(_){checkCache.pending=null;return false;}
    })();
    return checkCache.pending;
  }
  async function adminFetch(input,init){
    var url=sameOriginUrl(input);
    var current=token();
    var options=Object.assign({credentials:'same-origin',cache:'no-store'},init||{});
    var headers=new Headers(options.headers||{});
    if(current)headers.set('authorization','Bearer '+current);
    options.headers=headers;
    var response=await window.fetch(url.toString(),options);
    if(response.status===401||response.status===403)clear();
    return response;
  }
  async function requireAdmin(message){
    if(await check(false))return true;
    var password=window.prompt(message||'Admin-Passwort eingeben','');
    if(!password)return false;
    var result=await login(password);
    password='';
    return result.ok===true;
  }
  function logout(){clear();return true;}

  window.S666AdminAuth=Object.freeze({
    login:login,
    check:check,
    fetch:adminFetch,
    require:requireAdmin,
    logout:logout
  });
})();
