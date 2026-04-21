
// v15 Mobile EQ rebuild

const bars = document.querySelectorAll('.eq-bar-fill');
let running = false;
let raf;

function animate() {
    bars.forEach((bar, i) => {
        let v = Math.random() * 80 + 10;
        bar.style.height = v + "%";
    });
    if (running) raf = requestAnimationFrame(animate);
}

function startEQ() {
    if (!running) {
        running = true;
        animate();
    }
}

function stopEQ() {
    running = false;
    cancelAnimationFrame(raf);
    bars.forEach(bar => bar.style.height = "5%");
}

const audio = document.querySelector("audio");

if (audio) {
    audio.addEventListener("play", startEQ);
    audio.addEventListener("pause", stopEQ);
    audio.addEventListener("ended", stopEQ);
}
