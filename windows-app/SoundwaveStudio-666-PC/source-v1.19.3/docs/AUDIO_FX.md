# Audio FX

The three-band EQ was independently implemented with standard Web Audio
`BiquadFilterNode` and `GainNode` APIs. The idea of adding this capability was
informed by [Light Wave Tech](https://github.com/InfiniteQuantumZen/light_wave_tech)
by InfiniteQuantumZen / Sambodhi Padmasamadhi. Its repository identifies its
code as CC BY-NC 4.0; this implementation does not copy its code, shaders or
media, and does not change or relicense that project's materials.

The EQ uses low shelf (200 Hz), peaking mid (1 kHz) and high shelf (4 kHz)
filters with ±12 dB controls, a flat default, bypass and reset. A separate
mid/side stereo-width control ranges from mono (0%) to wider stereo (200%).
At 100% it preserves the original channel layout; other settings downmix to
stereo. Above 100%, center level is reduced to avoid increasing the peak.
EQ bypass does not bypass the stereo-width control. It processes
local, radio and SoundCloud playback before the analyser, selected output and
video export. The microphone is not equalized or monitored. It feeds the
visualizer and, only when explicitly selected in Audio Devices, video exports.
Positive gain may clip; reduce the playback level if needed.
The stereo-width control is an independent standard mid/side implementation,
not Light Wave Tech's decorrelation algorithm. Its Python and quantum modules
and its original shaders and media are not bundled.

## Optional 7.1 playback

The independent Web Audio upmix is inspired by the capability, not copied from
Light Wave Tech; no source or media from that project is used. It is off by
default, preserving the existing playback connection and channel layout.
Enable it explicitly in Audio devices after choosing the playback output. It
requires the active AudioContext's sink identity and a destination
`maxChannelCount` of at least eight; unsupported or failed setup is reported.
Switching outputs or a device-change notification disables it; re-enable only
after checking the output. The analyser and video-export branches never receive
the upmix. It is derived from the post-EQ signal (including stereo width), not
native discrete surround: multichannel inputs are downmixed to stereo first.

The eight discrete channels are FL, FR, center, LFE, rear L/R, side L/R.
For stereo L/R they contain respectively `0.5L`, `0.5R`, `0.25(L+R)`,
`lowpass(0.125(L+R))`, `0.25L`, `0.25R`, `0.35L`, `0.35R`; LFE uses a
120 Hz low-pass filter. The gains reserve headroom for bounded stereo input,
but prior EQ boosts, downmixing and filter transients can still clip; lower the
playback level when needed.

Offline Electron tests verify the synthetic channel signals, not actual
hardware. The browser's reported maximum is not a guarantee of speaker
configuration, channel order, OS/driver routing or audible output; verify on
the target 7.1 hardware. Changes that the platform fails to notify cannot be
detected reliably. Source availability and stream quality remain controlled
by their existing source/stream settings; this upmix does not change them.
