'use strict';
window.SV = window.SV || {};
window.SV.hexToRgb01 = (color) => {
  const hex = String(color || '#3aa6ff').replace('#', '');
  const value = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex.slice(0, 6), 16);
  return [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255];
};
