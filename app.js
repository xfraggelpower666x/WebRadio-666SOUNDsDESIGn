const STREAM_URL = "https://666soundsdesign.fraggelpower666.workers.dev/stream";
const STATUS_URL = "https://666soundsdesign.fraggelpower666.workers.dev/status";

const audio = new Audio(STREAM_URL);
audio.crossOrigin = "anonymous";
audio.volume = 0.85;

const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const volume = document.getElementById("volume");

playBtn.addEventListener("click", async () => {
  try {
    await audio.play();
  } catch (err) {
    console.error("Play failed", err);
  }
});

stopBtn.addEventListener("click", () => {
  audio.pause();
  audio.currentTime = 0;
});

volume.addEventListener("input", () => {
  audio.volume = Number(volume.value);
});

async function updateMeta() {
  try {
    const res = await fetch(STATUS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    document.getElementById("song").textContent = data.song || data.title || "No title";
    document.getElementById("listeners").textContent = String(data.listeners ?? data.unique ?? 0);
    document.getElementById("bitrate").textContent = String(data.bitrate ?? 0);
    document.getElementById("dj").textContent = data.dj || data.djusername || "---";
    document.getElementById("worker").textContent = "ONLINE";
  } catch (err) {
    document.getElementById("worker").textContent = "OFFLINE";
    console.error("Status error", err);
  }
}

updateMeta();
setInterval(updateMeta, 5000);
