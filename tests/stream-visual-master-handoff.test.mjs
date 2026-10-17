import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const root='666STREAM_STRUCTURE_CONTROL/';
const nav=JSON.parse(readFileSync(root+'visual/MASTER_BRIDGE_HANDOFF_NAVIGATION.json','utf8'));
const dash=readFileSync(root+'current/CORE_DASHBOARD_CONTRACT.md','utf8');
const live=readFileSync(root+'continuity/LIVE_CIRCLE.md','utf8');
test('master bridge visual routing supplies two usable, honest peer actions',()=>{
  assert.equal(nav.owner,'666STREAM_STRUCTURE_CONTROL');
  assert.equal(nav.targets.length,2);
  assert.deepEqual(nav.targets.map(x=>x.id),['LYVRA','666CLIC']);
  assert.equal(nav.master_reference_id,'666STREAM-CODEFORGE-BRIDGE-MASTER');
  for(const t of nav.targets){
    assert.equal(t.status,'PREPARED_NOT_DELIVERED');
    assert.ok(t.native_trigger && t.intake_text.includes(t.native_trigger));
    assert.ok(t.intake_text.includes(nav.source));
    assert.equal(t.action.startsWith('COPY_AND_USE_IN_'),true);
    assert.equal(existsSync(t.handoff_path),true);
  }
  assert.equal(nav.boundaries.automatic_cross_chat_dispatch,false);
  assert.equal(nav.boundaries.foreign_repository_write,false);
  assert.equal(nav.boundaries.copy_is_adoption,false);
  assert.match(dash,/MASTER_BRIDGE_HANDOFF_NAVIGATION.json/);
  assert.match(live,/COPY_NE_PEER_ADOPTION=true/);
});
