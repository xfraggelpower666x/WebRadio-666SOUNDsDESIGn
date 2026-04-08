window.DeviceMode = (() => {
  const ua = navigator.userAgent || "";
  const isIPhone = /iPhone/i.test(ua);
  const isIPad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isTouch = navigator.maxTouchPoints > 0;

  const mode = isIPhone || isIPad ? "iphone" : isAndroid ? "android" : "desktop";

  return {
    ua,
    mode,
    isIPhone,
    isIPad,
    isAndroid,
    isTouch,
    isMobile: mode !== "desktop",

    apply() {
      document.documentElement.setAttribute("data-device-mode", mode);
      document.body.classList.add(`mode-${mode}`);
    },

    stallMs() {
      const cfg = window.RADIO_CONFIG?.failover || {};
      return mode === "iphone"
        ? (cfg.iphoneStallMs || 15000)
        : mode === "android"
        ? (cfg.androidStallMs || 10000)
        : (cfg.desktopStallMs || 7000);
    }
  };
})();
