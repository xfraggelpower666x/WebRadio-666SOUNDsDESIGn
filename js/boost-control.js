window.BoostControl = {
  mounted: false,

  mount() {
    if (this.mounted || document.getElementById("boostPanel")) return;
    this.mounted = true;

    const panel = document.createElement("div");
    panel.id = "boostPanel";
    panel.className = "boost-panel";
    panel.innerHTML = `
      <button data-boost-level="0">GR 0</button>
      <button data-boost-level="1">GR 1</button>
      <button data-boost-level="2">GR 2</button>
      <button data-boost-level="3">GR 3</button>
    `;

    const status = document.createElement("div");
    status.id = "boostStatus";
    status.innerHTML = `BOOST GR ${String(window.SystemState?.boostLevel || 0)} <span id="boostLed"></span>`;

    document.body.appendChild(panel);
    document.body.appendChild(status);

    panel.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const lvl = Number(btn.getAttribute("data-boost-level"));
        if (window.RadioCore && RadioCore.applyBoost) {
          RadioCore.applyBoost(lvl);
        } else {
          SystemState.set({ boostLevel: lvl });
        }
      });
    });

    if (window.SystemState && typeof SystemState.applyToDom === "function") {
      SystemState.applyToDom();
    }
  }
};
