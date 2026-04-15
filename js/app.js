const audio=new Audio();
const cfg=window.STREAM_CONFIG||{};
const status=document.getElementById('status');
const level=document.getElementById('level');

let ctx, analyser, source;

document.getElementById('play').onclick=async()=>{
 try{
  status.textContent='Verbinde…';
  audio.src=cfg.streamUrl;
  await audio.play();
  setupAudio();
  status.textContent='Live';
 }catch(e){status.textContent='Fehler';}
};

document.getElementById('stop').onclick=()=>{
 audio.pause();audio.src='';
 status.textContent='Bereit';
};

function setupAudio(){
 if(!ctx){
  ctx=new AudioContext();
  analyser=ctx.createAnalyser();
  source=ctx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(ctx.destination);
  loop();
 }
}

function loop(){
 requestAnimationFrame(loop);
 if(!analyser)return;
 const data=new Uint8Array(analyser.frequencyBinCount);
 analyser.getByteFrequencyData(data);
 let avg=data.reduce((a,b)=>a+b,0)/data.length;
 level.style.width=(avg/255*100)+'%';
}
