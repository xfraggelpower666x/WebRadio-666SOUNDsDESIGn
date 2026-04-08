window.YouTubeOverlay = {
  player: null,
  ready: false,

  init() {
    if (window.YT && window.YT.Player) {
      this.mount();
    }
  },

  mount() {
    if (!document.getElementById("yt")) return;

    this.player = new YT.Player("yt", {
      height: "100%",
      width: "100%",
      videoId: RADIO_CONFIG.youtubeVideoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        mute: 1,
        loop: 1,
        playlist: RADIO_CONFIG.youtubeVideoId,
        modestbranding: 1,
        rel: 0
      },
      events: {
        onReady: () => {
          this.ready = true;
          if (window.SystemState) {
            SystemState.set({ videoReady: true });
          }
        }
      }
    });
  },

  play() {
    try {
      if (this.player) this.player.playVideo();
      if (window.SystemState) {
        SystemState.set({ mode: "youtube", videoReady: true });
      }
    } catch (e) {}
  },

  pause() {
    try {
      if (this.player) this.player.pauseVideo();
    } catch (e) {}
  }
};

window.onYouTubeIframeAPIReady = function () {
  if (window.YouTubeOverlay) {
    YouTubeOverlay.mount();
  }
};
