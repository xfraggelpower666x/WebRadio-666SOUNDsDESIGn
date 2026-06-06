# REPORT v36.3.2 — MOBILE VISIBLE STATE HOTFIX

**Projekt:** WebRadio-666SOUNDsDESIGn  
**Version:** v36.3.2  
**Build:** v36.3.2-2026-06-05-mobile-visible-state-hotfix  
**Basis:** v36.3.1 PC Viewport Hotfix  
**Status:** PASS  
**Worker geändert:** Nein  

## Grund

Der iPhone-Screenshot zeigte mehrere sichtbare Mobile-Fehler:

- Footer-Version zeigte noch `V187`
- EQ-Bereich war leer / Bars fast unsichtbar
- Now-Playing-Text startete abgeschnitten
- kleines Header-Logo wirkte verloren
- Mobile-State wurde nicht konsequent von der zentralen Version überschrieben

## Korrektur

- Mobile-Version wird hart auf aktuelle Build-Version gesetzt
- EQ-Bars werden sichtbar nachgerüstet, wenn der Mobile-DOM sie leer erzeugt
- Now-Playing-Text wird gegen negative/alte Transform-Clips abgesichert
- Mobile-Logo bekommt praktische Mindest-/Maximalgröße
- Keine Worker-Änderung
