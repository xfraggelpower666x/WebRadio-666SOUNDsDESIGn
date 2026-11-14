import hashlib
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from import_export import import_presets, export_presets, collect

class ImportExportTests(unittest.TestCase):
    def test_roundtrip_exact_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); source=root/'source'; (source/'sub').mkdir(parents=True)
            binary=b'[preset00]\r\nfDecay=0.981\r\nper_frame_1=wave_r=sin(time);\r\n'
            (source/'sub'/'Original.MILK').write_bytes(binary)
            records=export_presets(source,root/'bundle.zip')
            self.assertEqual(records[0]['sha256'],hashlib.sha256(binary).hexdigest())
            imported=import_presets(root/'bundle.zip',root/'out')
            self.assertEqual(imported,records)
            self.assertEqual((root/'out'/'sub'/'Original.MILK').read_bytes(),binary)
            with self.assertRaises(FileExistsError): import_presets(root/'bundle.zip',root/'out')
    def test_zip_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); z=root/'bad.zip'
            with zipfile.ZipFile(z,'w') as f: f.writestr('../escape.milk','[preset00]\n')
            with self.assertRaises(ValueError): import_presets(z,root/'out')
            self.assertFalse((root/'escape.milk').exists())
    def test_duplicate_case_collision_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); z=root/'bad.zip'
            with zipfile.ZipFile(z,'w') as f:
                f.writestr('a.milk','[preset00]\n'); f.writestr('A.MILK','[preset00]\n')
            with self.assertRaises(ValueError): collect(z)
    def test_invalid_preset_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); f=root/'bad.milk'; f.write_text('not a preset')
            with self.assertRaises(ValueError): import_presets(f,root/'out')
    def test_export_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); f=root/'ok.milk'; f.write_bytes(b'[preset00]\n')
            zip_path=root/'out.zip'; zip_path.write_bytes(b'unchanged')
            with self.assertRaises(FileExistsError): export_presets(f,zip_path)
            self.assertEqual(zip_path.read_bytes(),b'unchanged')

if __name__=='__main__': unittest.main()
