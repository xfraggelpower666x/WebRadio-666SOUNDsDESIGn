# 666 / LYVRA CYBER INTRO HUD TEMPLATE v1.5

Status: reusable intro template for the WebRadio repository.

## Rules
- Phase 1 and Phase 2 use the SAME persistent background layer.
- Phase 1 transitions into Phase 2 with a cyan/pink energy sweep and crossfade.
- No redirect, no meta refresh, no window.location.replace(), no fixed target URL.
- Center logo slot stays neutral and receives no animation/filter/beat effect.
- Typography follows the cyan / violet / neon-pink cyber palette.

## Integration
Open `index.html` as a standalone preview or copy the `.lyvra-cyber-sequence` block into a host project.

Optional background path expected by default:
`assets/intro/lyvra-intro-background.jpg`

Projects can override the background without changing the template:
```css
.lyvra-cyber-sequence { --intro-bg: url("PATH/TO/BACKGROUND.jpg"); }
```

Events:
- `lyvra:intro-transition-start`
- `lyvra:intro-complete`
