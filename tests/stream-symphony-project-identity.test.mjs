import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const map=JSON.parse(readFileSync('666STREAM_STRUCTURE_CONTROL/current/PROJECT_MAP.json','utf8'));
const dashboard=readFileSync('666STREAM_STRUCTURE_CONTROL/current/CORE_DASHBOARD_CONTRACT.md','utf8');
test('Symphony is a selectable native LIGHT_ORCHESTRA project with an unresolved path',()=>{
 const p=map.projects.find(x=>x.id==='LIGHT_ORCHESTRA');
 assert.equal(p.name,'666 LIGHT ORCHESTRA SYMPHONY');
 assert.ok(p.aliases.includes('symphony'));
 assert.equal(p.project_selection_status,'KNOWN_NATIVE_PROJECT_CAN_SELECT');
 assert.equal(p.directory_readback_status,'UNVERIFIED_SEPARATE_CHILD_PATH');
 assert.deepEqual(p.roots,[]);
 assert.match(dashboard,/LIGHT_ORCHESTRA_PROJECT_SELECTION=AVAILABLE/);
 assert.notEqual(p.id,'GOVEE_CONTROL');
});
