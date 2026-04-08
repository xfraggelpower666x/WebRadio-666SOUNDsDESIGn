
const STREAM_MAIN = "https://my.idjstream.com/666soundsdesign/stream";

const audio = document.getElementById("audioPlayer");
const bootOverlay = document.getElementById("bootOverlay");
const bootStatus = document.getElementById("bootStatus");

let started = false;

document.getElementById("bootEnterBtn").addEventListener("click", async () => {
  bootStatus.textContent = "STARTING AUDIO...";

  try {
    audio.src = STREAM_MAIN;
    audio.load();

    await audio.play();

    // SAFE: start visuals AFTER play
    if (window.AudioReactiveEngine) {
      window.AudioReactiveEngine.start();
    }

    bootOverlay.style.display = "none";
    started = true;

  } catch (e) {
    bootStatus.textContent = "TAP AGAIN";
  }
});

document.getElementById("playBtn").addEventListener("click", async () => {
  if (!started) return;

  try {
    await audio.play();
  } catch(e){}
});

document.getElementById("pauseBtn").addEventListener("click", () => audio.pause());
document.getElementById("stopBtn").addEventListener("click", () => {
  audio.pause();
  audio.src = "";
});
