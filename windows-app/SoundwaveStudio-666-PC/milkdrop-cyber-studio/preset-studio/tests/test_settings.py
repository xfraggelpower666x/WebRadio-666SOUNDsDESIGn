import sys,tempfile,unittest,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from studio_settings import DEFAULTS,validate,load,save,source_capability

class SettingsTests(unittest.TestCase):
 def test_roundtrip(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'settings.json';settings=dict(DEFAULTS,display_width=2560,display_height=1440,audio_mode='browser-tab',audio_browser='edge')
   save(p,settings);self.assertEqual(load(p),validate(settings))
 def test_invalid_keeps_bytes(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'settings.json';save(p,DEFAULTS);before=p.read_bytes()
   with self.assertRaises(ValueError):save(p,dict(DEFAULTS,display_width=-10))
   self.assertEqual(p.read_bytes(),before)
 def test_missing_defaults(self):
  with tempfile.TemporaryDirectory() as d:self.assertEqual(load(Path(d)/'absent.json'),DEFAULTS)
 def test_capability_fail_closed(self):
  self.assertEqual(source_capability('browser-tab','safari')[0],'UNSUPPORTED_ON_WINDOWS')
  self.assertEqual(source_capability('browser-tab','firefox')[0],'UNVERIFIED')
  self.assertEqual(source_capability('browser-tab','chrome')[0],'PLANNED')
 def test_bounds(self):
  for k,val in [('fps_limit',9999),('overlay_alpha',1.9),('audio_mode','magic'),('display_height',10),('language','xx')]:
   with self.subTest(k=k),self.assertRaises(ValueError):validate({k:val})
if __name__=='__main__':unittest.main()
