GOVEE FX SCENE SYNC ADDON
=========================

This package extends the existing Cyber FX architecture with Govee-only scene coupling.

Included
--------
- Govee bridge client
- Govee scene sync engine
- FX control hooks
- integration documentation

Structure
---------
js/system-extra/govee/
docs/GOVEE_INTEGRATION.md

Purpose
-------
Couple ALL existing scene/effect systems to the Govee Light Bars using the already running
local Govee bridge and the main project's analyzer.

Important
---------
Use the same folder logic as the FX controller system.
Do not create separate chaotic structures.

The Govee bridge server remains local.
The main project only sends scene + analyzer data to that bridge.
