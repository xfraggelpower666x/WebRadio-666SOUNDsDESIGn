from __future__ import annotations
import json
import tempfile
import unittest
from pathlib import Path

from light_control_state import (
    COLOR_SCHEMES, MOTION_SCHEMES, DEFAULT_SCENES, PAIR_GROUPS,
    SceneStore, resolve_targets,
)

class LightControlStateTests(unittest.TestCase):
    def test_target_resolution_single_pair_all_custom(self):
        known=["govee_h6047","lenze_1","lenze_2","oc21w_1","oc21w_2"]
        self.assertEqual(resolve_targets("single",known,"lenze_1"),["lenze_1"])
        self.assertEqual(resolve_targets("pair",known,pair_name="PAIR A"),["lenze_1","lenze_2"])
        self.assertEqual(resolve_targets("all",known),known)
        self.assertEqual(resolve_targets("custom",known,custom_ids=["oc21w_2","bad","oc21w_2"]),["oc21w_2"])

    def test_presets_are_complete_and_bounded(self):
        self.assertGreaterEqual(len(COLOR_SCHEMES),5)
        self.assertGreaterEqual(len(MOTION_SCHEMES),7)
        self.assertGreaterEqual(len(DEFAULT_SCENES),4)
        for spec in COLOR_SCHEMES.values():
            self.assertEqual(len(spec["rgb"]),3)
            self.assertTrue(all(0 <= x <= 255 for x in spec["rgb"]))
            self.assertTrue(1 <= spec["brightness"] <= 100)

    def test_scene_store_round_trip_and_builtin_preservation(self):
        with tempfile.TemporaryDirectory() as td:
            store=SceneStore(td)
            scene={"color":"Cyber Pink","motion":"Pulse","brightness":75,"audio":True}
            path=store.save("My Scene",scene)
            self.assertTrue(Path(path).exists())
            loaded=store.list_scenes()
            self.assertEqual(loaded["My Scene"],scene)
            self.assertIn("Neon Dream",loaded)
            self.assertTrue(store.delete("My Scene"))
            self.assertNotIn("My Scene",store.list_scenes())

    def test_pair_definitions_do_not_duplicate_members(self):
        members=[]
        for values in PAIR_GROUPS.values():
            members.extend(values)
        self.assertEqual(len(members),len(set(members)))

if __name__ == "__main__":
    unittest.main()
