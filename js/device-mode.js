window.DeviceMode = (() => {
  const ua = navigator.userAgent || "";
  const isIPhone = /iPhone/i.test(ua);
  const isIPad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const mode = isIPhone || isIPad ? "iphone" : isAndroid ? "android" : "desktop";
  return {
    mode,
    apply(){ document.documentElement.setAttribute("data-device-mode", mode); },
    stallMs(){ return mode === "iphone" ? 22000 : mode === "android" ? 12000 : 8000; }
  };
})();
