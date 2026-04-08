document.addEventListener("DOMContentLoaded", () => {
  if (window.RadioCore) RadioCore.init();
  if (window.iOSFix) iOSFix.init();

  document.body.classList.add("live-experience-ready");

  ["left", "center", "right"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("live-panel-react");
  });

  if (window.BoostControl) BoostControl.mount();

  const bind = (ids, fn) => {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    });
  };

  bind(["startBtn", "playBtn", "btnPlay", "playMainBtn"], async () => {
    if (window.AudioReactive) AudioReactive.start();
    await FailoverEngine.run();
  });

  bind(["backupBtn", "playBackupBtn", "btnBackup"], async () => {
    if (window.AudioReactive) AudioReactive.start();
    await RadioCore.playBackup();
  });

  bind(["stopBtn", "btnStop"], () => {
    RadioCore.stop();
  });

  bind(["pauseBtn", "btnPause"], () => {
    if (RadioCore.audio) RadioCore.audio.pause();
  });

  bind(["autoDjStartBtn"], () => {
    if (window.AutoDJ) AutoDJ.start();
  });

  bind(["autoDjNextBtn"], () => {
    if (window.AutoDJ) AutoDJ.next();
  });

  if (window.SmartFailover && SmartFailover.init) SmartFailover.init();

  const loop = async () => {
    if (window.MetadataUI) {
      await MetadataUI.pullHealth();
      await MetadataUI.update();
    }
  };

  loop();
  setInterval(loop, RADIO_CONFIG.metadataPollMs || 5000);
});
