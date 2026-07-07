GOVEE FX + SCENE SYNC INTEGRATION
=================================

Purpose
-------
This addon couples the local Govee LAN bridge to:
- all analyzer-driven light effects
- all FX scene states
- all preset scene changes
- all major audio-reactive systems already built in the project

It is designed to use the SAME folder logic as the FX controller package.

Folder Structure
----------------
Place these files inside the main project exactly here:

js/system-extra/govee/
  govee-sync-config.js
  govee-bridge-client.js
  govee-scene-sync.js
  govee-fx-control-hooks.js

What It Couples
---------------
This Govee layer is intended to follow:
- Hero Tunnel
- Plasma Background
- Kaleidoscope Tunnel
- Audio Reactive Tiles
- Lightning Storm Mode
- FX presets
- FX scene engine
- Spectrum / analyzer energy
- Drop / break / build / idle states

Bridge Requirement
------------------
The local Govee bridge must be running.
Default local endpoint:
http://localhost:3000

Your configured Govee device:
- Name: GOVEE-LIGHT-BARS
- IP: 192.168.2.110
- Model: H6047
- MAC: 60:74:F4:40:D9:A2

IMPORTANT:
LAN Control must remain enabled in the Govee app.
If LAN Control is disabled, the bridge will not work.

Main Project Files That Must Stay Untouched
-------------------------------------------
Do NOT replace:
- config/stream-config.js
- js/workers/cors-proxy-worker.js
- js/core/shared-audio-engine.js
- js/core/shared-analyzer.js
- js/ui/sticky-player.js

The stream and worker setup remain inside the main project.

Bootstrap Integration
---------------------
Add imports to:
js/core/shared-bootstrap.js

Imports:

import { initGoveeSceneSync } from "/js/system-extra/govee/govee-scene-sync.js";
import { initGoveeFxControlHooks } from "/js/system-extra/govee/govee-fx-control-hooks.js";

Initialize AFTER analyzer startup:

const goveeSync = initGoveeSceneSync(app);
initGoveeFxControlHooks();

Recommended Boot Position
-------------------------
Initialize after:
- app.audio
- app.meta
- app.analyzer
- FX preset loader
- FX scene engine

That ensures Govee receives final scene state, not partial state.

Suggested Main Flow
-------------------
Stream
 -> Shared Audio Engine
 -> Shared Analyzer
 -> FX Scene Engine / FX Presets
 -> Govee Scene Sync
 -> Local Govee Bridge
 -> GOVEE LIGHT BARS

FX Controller UI Hook Suggestions
---------------------------------
You can add these controls to the existing FX controller:

<label><input id="goveeEnableSync" type="checkbox" checked> Enable Govee Sync</label>

<select id="goveeModeSelect">
  <option value="cyber">Cyber</option>
  <option value="club">Club</option>
  <option value="ambient">Ambient</option>
</select>

<button id="goveeTestColor">Test Cyan</button>

Behavior
--------
The sync layer uses:
- analyzer bass / mid / high / energy
- current scene state from document.body dataset
- current preset theme hints

Scene Mapping
-------------
By default:
- idle  -> ambient
- build -> cyber
- break -> ambient
- drop  -> club
- storm -> club

This mapping can be changed in:
js/system-extra/govee/govee-sync-config.js

Later Main Project TODO
-----------------------
When the main project review is finished:
1. merge the govee folder into js/system-extra/
2. add imports to shared-bootstrap.js
3. initialize after analyzer startup
4. optionally add LIGHT SYNC controls to the FX controller
5. verify that Govee follows scene changes and beat changes
6. verify sticky player remains untouched
