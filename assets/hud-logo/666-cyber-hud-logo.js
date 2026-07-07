/*
Created: 2026-05-25
Modified: 2026-05-25
Purpose: Optional beat-pulse helper for 666 Cyber HUD Logo.
Change Summary: Adds lightweight random demo beat pulse and exposes window.pulseCyberHudLogo().
*/

(function () {
  const logo = document.querySelector('.cyber-hud-logo');
  if (!logo) return;

  function pulse() {
    logo.classList.add('is-beat');
    window.setTimeout(() => logo.classList.remove('is-beat'), 130);
  }

  // Öffentlich nutzbar: Dein Player kann bei Bassdrum/Analyzer-Peak diese Funktion aufrufen.
  window.pulseCyberHudLogo = pulse;

  // Demo-Pulse, damit man die Wirkung direkt sieht.
  let demo = true;
  window.setCyberHudDemoPulse = function (enabled) {
    demo = !!enabled;
  };

  window.setInterval(() => {
    if (!demo) return;
    pulse();
  }, 666);
})();
