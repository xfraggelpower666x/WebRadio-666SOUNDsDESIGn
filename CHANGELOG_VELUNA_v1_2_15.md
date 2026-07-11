# VELUNA v1.2.15

## PC fixed cockpit canvas

- Desktop cockpit now uses one fixed internal 1720 × 980 geometry.
- Window resizing scales the complete cockpit uniformly instead of reflowing individual modules.
- Canonical horizontal order is fixed: left level meter, left vertical panel tower, player, right vertical panel tower, right level meter.
- Player, towers and meters keep their proportions and cannot overlap or nest into each other.
- Fullscreen may scale the cockpit slightly upward; smaller windows scale it down as a complete unit.
- Mobile/iPhone layout and audio logic are untouched.
