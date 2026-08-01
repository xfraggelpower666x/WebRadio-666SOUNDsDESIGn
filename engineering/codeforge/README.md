# CodeForge Radio Coding Agent

Direkt ausführbarer, radio-spezialisierter Coding-Agent für dieses Repository. Der universelle CodeForge-Kern bleibt eine getrennte Identität; das Radio wird über dieses Repository-Modul spezialisiert.

## Pfad

`engineering/codeforge/`

## Funktionen

- read-only Repository-Audit mit SHA-256-Evidence
- Schutz der Player-, Audio-, Worker-, Auth-, Discord-, GOVEE- und Deploypfade
- Secret-Signal-Erkennung mit redigierten Werten
- Evidence-gebundene Change-Proposals ohne automatische Ausführung
- versiegelte Fortsetzungslogik: Checkpoint → Integration → Knowledge → ReAudit → Resume

## Start

```bash
python engineering/codeforge/codeforge_radio_agent.py audit .
python -m unittest engineering/codeforge/tests/test_radio_agent.py -v
```

Produktionsbranch, Cloudflare und Radio-Laufzeit werden durch diese Integration nicht verändert.
