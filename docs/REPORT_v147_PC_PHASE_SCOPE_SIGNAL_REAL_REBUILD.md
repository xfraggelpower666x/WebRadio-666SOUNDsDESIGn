# v147 — PC Phase Scope Signal Real Rebuild

Basis: v146 PC VU Matrix Cachebust Fix.

Scope: only existing right-middle Phase Scope module + version/cacheburst.

Changes:
- Existing Phase Scope layer enhanced; no new panel, canvas, audio loop, RAF loop, or interval.
- Phase grid, line and cloud now use the same existing EQ/levelmeter source variables.
- Added irregular shape motion via existing `.phase-cloud` and existing `.phase-line`.
- Version/cacheburst updated to v147.

Tabu respected:
- No Audio Reactor changes.
- No Spectrum Grid changes.
- No VU Matrix changes.
- No Ticker/Transport/iPhone/Discord/Worker/Stream changes.
