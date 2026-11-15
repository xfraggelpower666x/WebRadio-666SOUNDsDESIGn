'use strict';
((root) => {
  function createSoundCloudPlayback(audio, Hls, onError) {
    let player = null;
    function stop() {
      if (player) { player.destroy(); player = null; }
    }
    function load(source) {
      stop();
      if (source.playbackKind === 'hls') {
        if (Hls && Hls.isSupported()) {
          const current = new Hls({ enableWorker: false });
          player = current;
          current.on(Hls.Events.ERROR, (_event, data) => {
            if (player === current && data.fatal) {
              stop();
              onError('SoundCloud HLS playback failed · ' + String(data.details || data.type || 'stream error'));
            }
          });
          current.loadSource(source.mediaUrl);
          current.attachMedia(audio);
        } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          audio.src = source.mediaUrl;
          audio.load();
        } else throw new Error('SoundCloud HLS playback is not supported on this system');
      } else {
        audio.src = source.mediaUrl;
        audio.load();
      }
    }
    return { load, stop };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createSoundCloudPlayback };
  else root.createSoundCloudPlayback = createSoundCloudPlayback;
})(globalThis);
