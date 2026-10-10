# RADIO WAVE v6.66 — Architecture Lock

DATE=2026-10-10
SYSTEM=666STREAM
PROJECT=WINDOWS_APP
STATUS=ARCHITECTURE_HARDLOCK

PRODUCT_NAME=RADIO WAVE v6.66

CORE_RULES:
- SOUNDWAVE_CORE=PRESERVE
- SOUNDWAVE_FUNCTION_REMOVAL=FORBIDDEN
- RADIO=ADDITIVE_ADDON
- DESIGN=TRANSFORM_AND_ADAPT
- SEPARATE_RADIO_PLAYER=FORBIDDEN
- SEPARATE_SOUNDWAVE_APP_SELECTION=FORBIDDEN
- SOUNDWAVE_HIDDEN_BEHIND_MENU=FORBIDDEN
- PRODUCTION_WEBRADIO_MUTATION=NONE

PLAYER_ARCHITECTURE:
- ONE_PLAYER_PIPELINE=TRUE
- SOURCES=LOCAL|RADIO|SOUNDCLOUD
- LOCAL_AUDIO=USES_SOUNDWAVE_PLAYER
- RADIO_AUDIO=USES_SAME_SOUNDWAVE_PLAYER
- SOUNDCLOUD_AUDIO=USES_SAME_SOUNDWAVE_PLAYER
- ANALYSIS_PATH=SHARED
- VISUALIZATION_PATH=SHARED
- DUPLICATE_AUDIO_ENGINE=FORBIDDEN

SOUNDWAVE_PRESERVED_FUNCTIONS:
- offline local music playback
- original Soundwave visualizer set
- spectrum engine
- deep analyzer
- shader engine
- 3D geometry engine
- MilkDrop and .milk import
- equalizer and tone shaping
- background and overlay system
- export functions
- display output system
- SoundCloud integration
- runtime recovery and diagnostics

RADIO_ADDON:
- main stream
- fallback stream
- Now Playing
- DJ metadata
- stream artwork
- listeners/bitrate/codec/sample-rate when supplied
- MAIN/FALLBACK/DEGRADED status
- Player Messenger
- Discord adapters
- admin controls where already supported

MAIN_UI:
- Soundwave visualization is a permanent primary surface.
- Radio controls and metadata are combined with the Soundwave visualization.
- Main window uses the full available application area by default.
- Settings/EQ/import may use drawers/overlays and must not hide the music visualization unnecessarily.
- RADIO/WAVE switching changes source/mode, not the underlying player ownership.

RADIO_METADATA_VISUAL_LAYER:
- continuous ticker supported over the Soundwave visualization
- ticker fields may include artist, title, DJ, station and stream information
- ticker position/speed/size/transparency configurable
- stream artwork displayed in a status panel
- status panel may show track, artist, DJ, listeners, bitrate, codec/sample rate, route state and connection state
- unavailable metadata fields collapse cleanly

SECOND_DISPLAY:
- optional visual output when a second monitor is present
- second display is visualization-first fullscreen output
- modes: VISUAL_ONLY|VISUAL_PLUS_TICKER|VISUAL_PLUS_TICKER_AND_STATUS
- second display must not start a second audio stream
- source/analyzer state is synchronized from the primary player
- hotplug/display selection retained from Soundwave behavior

DESIGN:
- cyber neon laser pink/lilac/cyan
- larger default window
- hover glow on buttons
- import progress with percentage
- supplied RADIO WAVE banner/icon/in-app logo assets
- footer: COPYRIGHT 2026 BY FRAGGLEPOWER666 - 666SOUNDsDESIGN
- cyber startup sequence before app start
- Windows installer target preserved

IMPLEMENTATION_PRINCIPLE:
Soundwave remains the complete functional base. RADIO WAVE v6.66 is the redesigned combined surface, and WebRadio is an additive source/information layer inside Soundwave. Existing Soundwave capabilities are adapted to the RADIO WAVE design rather than replaced by reduced Python substitutes.
