'use strict';

function createAudioPermissionGate({ getMainWindow, isTrustedUrl, now = Date.now }) {
  const until = { microphone: 0, output: 0 };
  function trusted(contents, details) {
    const main = getMainWindow();
    return !!main && !main.isDestroyed() && contents === main.webContents &&
      !contents.isDestroyed() && details?.isMainFrame === true &&
      isTrustedUrl(contents.getURL()) && (!details.requestingUrl || isTrustedUrl(details.requestingUrl));
  }
  function allowed(kind) { return until[kind] > now(); }
  return {
    arm(event, kind) {
      if (!Object.hasOwn(until, kind)) throw new Error('Invalid audio permission.');
      const main = getMainWindow();
      if (!main || event.sender !== main.webContents || event.senderFrame !== main.webContents.mainFrame ||
          !isTrustedUrl(event.senderFrame.url)) throw new Error('Audio permission sender blocked.');
      until[kind] = now() + 30000;
    },
    revoke(kind) { if (Object.hasOwn(until, kind)) until[kind] = 0; },
    check(contents, permission, _origin, details) {
      if (!trusted(contents, details)) return false;
      if (permission === 'media') return allowed('microphone') && details.mediaType === 'audio';
      if (permission === 'speaker-selection') return allowed('output');
      return false;
    },
    request(contents, permission, details) {
      if (!trusted(contents, details)) return false;
      if (permission === 'media') return allowed('microphone') &&
        Array.isArray(details.mediaTypes) && details.mediaTypes.length === 1 && details.mediaTypes[0] === 'audio';
      if (permission === 'speaker-selection') return allowed('output');
      return false;
    }
  };
}

function forwardOverlayMicrophone(event, { getMainWindow, getDevicesWindow, isTrustedOverlayUrl }) {
  const main = getMainWindow();
  const overlay = getDevicesWindow();
  if (!main || main.isDestroyed() || !overlay || overlay.isDestroyed() ||
      event.sender !== overlay.webContents || event.sender.isDestroyed() ||
      event.senderFrame !== overlay.webContents.mainFrame ||
      !isTrustedOverlayUrl(event.sender.getURL()) || !isTrustedOverlayUrl(event.senderFrame.url)) {
    throw new Error('Microphone overlay sender blocked.');
  }
  main.webContents.send('audio:overlay-microphone');
  return { ok: true };
}

module.exports = { createAudioPermissionGate, forwardOverlayMicrophone };
