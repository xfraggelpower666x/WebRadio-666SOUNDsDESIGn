# LYVRA COMPACT SUNO FORMAT v1.0.0

## Lyrics line rule

Hybrid story lines default to 2-5 words. Longer lines are rare protected exceptions.

## Layout rule

No decorative separator lines.
No blank line after every lyric line.
No blank line between structure metadata, voice metadata and lyrics.
Blank lines only when strictly required between major sections.

## Metadata syntax

(Section | Time | Atmosphere | Energy | Arrangement)
[Voice | Delivery | Effects | Psy FX]
Lyrics directly below.

Example:

(Drop | 0:42-1:14 | Peak-Time | Rolling Bass | Acid Lead)
[Female Lead | Crowd Response | Delay | Psy FX]
THE MOMENT IS NOW!
CROSS THE LINE!
RIGHT NOW!

## Prompt rule

Extended and Style prompts contain production instructions, not emotional explanation.

Priority fields:
BPM | kick | bass | sub | percussion | acid | lead | voice | space | dynamics | structure | ending.

## Compactor gate

Before output:
- remove redundant prose
- merge related metadata
- remove unnecessary whitespace
- preserve all protected meaning
- count characters
- retain safety buffer
