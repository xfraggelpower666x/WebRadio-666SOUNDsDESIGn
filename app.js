const audio = document.getElementById('audio');

const MAIN = "https://my.idjstream.com/666soundsdesign/stream";
const BACKUP = "https://my.idjstream.com/8686/stream";

function playMain(){
  audio.src = MAIN;
  audio.play();
}

function playBackup(){
  audio.src = BACKUP;
  audio.play();
}

function stop(){
  audio.pause();
}
