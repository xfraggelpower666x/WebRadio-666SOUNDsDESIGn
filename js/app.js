
const STREAM = "https://webradio-666soundsdesign-worker.fraggelpower666.workers.dev/stream";
const STATUS = "https://webradio-666soundsdesign-worker.fraggelpower666.workers.dev/status";

const audio = document.getElementById("audio");

function play(){
  audio.src = STREAM;
  audio.play();
}

function stop(){
  audio.pause();
}

async function update(){
  try{
    const res = await fetch(STATUS);
    const data = await res.json();
    document.getElementById("status").innerText = "ONLINE";
    document.getElementById("song").innerText = data.song;
  }catch{
    document.getElementById("status").innerText = "OFFLINE";
  }
}

setInterval(update,3000);
update();
