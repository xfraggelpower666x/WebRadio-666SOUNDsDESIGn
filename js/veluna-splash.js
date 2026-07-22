/* Central player splash pre-paint gate v1.2.19 — no player layout mutation */
(()=>{'use strict';
 const ROOT=document.documentElement;
 const SESSION_KEY='s666_player_intro_seen_v1';
 const reveal=()=>{ROOT.removeAttribute('data-s666-splash-pending');ROOT.removeAttribute('data-s666-splash-active');};
 try{if(sessionStorage.getItem(SESSION_KEY)==='1'){reveal();return;}sessionStorage.setItem(SESSION_KEY,'1');}catch(_){}
 const A=window.VELUNA_ASSETS||{};
 if(document.querySelector('[data-veluna-central-splash="1"]'))return;
 const splash=document.createElement('div');
 splash.dataset.velunaCentralSplash='1';splash.setAttribute('aria-hidden','true');
 Object.assign(splash.style,{position:'fixed',inset:'0',zIndex:'2147483000',display:'flex',alignItems:'center',justifyContent:'center',background:'#040408',overflow:'hidden',pointerEvents:'none',opacity:'1',transition:'opacity .42s ease'});
 const video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.preload='auto';video.setAttribute('webkit-playsinline','');video.setAttribute('disablepictureinpicture','');
 Object.assign(video.style,{width:'100%',height:'100%',objectFit:'contain',background:'#040408'});
 const webm=document.createElement('source');webm.src=A.splashWebm||'/assets/veluna/splash/veluna-loading-splash.webm';webm.type='video/webm';
 const mp4=document.createElement('source');mp4.src=A.splashMp4||'/assets/veluna/splash/veluna-loading-splash.mp4';mp4.type='video/mp4';
 video.append(webm,mp4);splash.append(video);document.body.append(splash);ROOT.setAttribute('data-s666-splash-active','1');window.VELUNA_CENTRAL_SPLASH_READY=true;
 let done=false;const finish=()=>{if(done)return;done=true;splash.style.opacity='0';setTimeout(()=>{splash.remove();reveal();},480)};
 video.addEventListener('ended',finish,{once:true});video.addEventListener('error',finish,{once:true});setTimeout(finish,7200);video.play().catch(()=>setTimeout(finish,1200));setTimeout(reveal,8200);
})();
