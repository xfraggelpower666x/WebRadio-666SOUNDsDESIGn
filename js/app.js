const STREAM_URL = "https://webradio-666soundsdesign-worker.fraggelpower666.workers.dev/stream";
const STATUS_URL = "https://webradio-666soundsdesign-worker.fraggelpower666.workers.dev/status";

const audio = document.getElementById("audio");
audio.src = STREAM_URL;
audio.crossOrigin = "anonymous";
audio.volume = 0.85;

document.getElementById("playBtn").addEventListener("click", async () => { try { await audio.play(); } catch(e) { console.error(e); }});
document.getElementById("stopBtn").addEventListener("click", () => { audio.pause(); audio.currentTime = 0; });
document.getElementById("volumeRange").addEventListener("input", e => audio.volume = Number(e.target.value));

async function updateStatus(){
  try{
    const res = await fetch(STATUS_URL, { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    document.getElementById("workerStatus").textContent = "ONLINE";
    document.getElementById("songValue").textContent = data.song || data.title || "No title";
    document.getElementById("listenersValue").textContent = String(data.listeners ?? 0);
    document.getElementById("bitrateValue").textContent = String(data.bitrate ?? 0);
    document.getElementById("djValue").textContent = data.dj || data.djusername || "---";
  }catch(e){
    document.getElementById("workerStatus").textContent = "OFFLINE";
  }
}
updateStatus();
setInterval(updateStatus, 5000);
