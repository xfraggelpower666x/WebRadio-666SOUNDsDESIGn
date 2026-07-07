export const GOVEE_SYNC_CONFIG = {
  enabled: true,

  // local bridge endpoint
  baseUrl: "http://localhost:3000",

  // how often audio packets are sent to the bridge
  sendIntervalMs: 90,

  // scene coupling
  sceneCoupling: true,
  effectCoupling: true,

  // payload scaling
  gain: 1,
  bassWeight: 1.15,
  midWeight: 0.95,
  highWeight: 1.0,

  // flash behavior
  beatFlash: true,
  dropFlash: true,

  // scene -> bridge mode mapping
  sceneModeMap: {
    idle: "ambient",
    build: "cyber",
    break: "ambient",
    drop: "club",
    storm: "club"
  },

  // preset/theme coupling hints for local light styling
  themeColorMap: {
    "pink-cyan": { r: 255, g: 70, b: 220 },
    "neon-green": { r: 70, g: 255, b: 170 },
    "cyan-yellow": { r: 0, g: 220, b: 255 },
    "electric-blue": { r: 50, g: 150, b: 255 },
    "cyan": { r: 0, g: 210, b: 255 }
  }
};
