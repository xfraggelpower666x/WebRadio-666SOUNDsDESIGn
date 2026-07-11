/* VELUNA central splash only v1.2.14 — no player layout mutation */
(()=>{'use strict';
 const A=window.VELUNA_ASSETS||{};
 if(document.querySelector('[data-veluna-central-splash="1"]'))return;
 const splash=document.createElement('div');
 splash.dataset.velunaCentralSplash='1';
 splash.setAttribute('aria-hidden','true');
 Object.assign(splash.style,{position:'fixed',inset:'0',zIndex:'2147483000',display:'flex',alignItems:'center',justifyContent:'center',background:'#040408',overflow:'hidden',pointerEvents:'none',opacity:'1',transition:'opacity .42s ease'});
 const video=document.createElement('video');
 video.autoplay=true;video.muted=true;video.playsInline=true;video.preload='auto';
 video.setAttribute('webkit-playsinline','');video.setAttribute('disablepictureinpicture','');
 Object.assign(video.style,{width:'100%',height:'100%',objectFit:'contain',background:'#040408'});
 const w=document.createElement('source');w.src=A.splashWebm||'/assets/veluna/splash/veluna-loading-splash.webm';w.type='video/webm';
 const m=document.createElement('source');m.src=A.splashMp4||'/assets/veluna/splash/veluna-loading-splash.mp4';m.type='video/mp4';
 video.append(w,m);splash.append(video);document.body.append(splash);
 let done=false;const finish=()=>{if(done)return;done=true;splash.style.opacity='0';setTimeout(()=>splash.remove(),480)};
 video.addEventListener('ended',finish,{once:true});video.addEventListener('error',finish,{once:true});setTimeout(finish,7200);video.play().catch(()=>setTimeout(finish,1200));
})();
