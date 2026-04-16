const a=document.getElementById("a");
let m=false;

function start(){
let p=0;
const bar=document.getElementById("bar");
const t=setInterval(()=>{
p+=5;
bar.style.width=p+"%";
if(p>=100){
clearInterval(t);
document.getElementById("boot").style.display="none";
document.getElementById("player").style.display="block";
}
},50);
}

function play(){
a.src="/stream";
a.play();
}

function pause(){a.pause();}
function mute(){m=!m;a.muted=m;}
