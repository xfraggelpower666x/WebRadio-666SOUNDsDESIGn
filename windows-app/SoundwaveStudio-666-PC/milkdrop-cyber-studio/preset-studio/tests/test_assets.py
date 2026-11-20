import sys, tempfile, unittest, zipfile, hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from asset_manager import import_assets, export_assets, safe_rel, convert_image, classify_preset

class AssetsTest(unittest.TestCase):
    def test_import_multi_and_export_roundtrip(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td);a=d/'alpha.png';b=d/'beta.png';a.write_bytes(b'abc');b.write_bytes(b'def')
            folder,rows=import_assets([a,b],d/'lib','sprites')
            self.assertEqual(len(rows),2)
            self.assertEqual((folder/'alpha.png').read_bytes(),b'abc')
            outfile=d/'assets.zip';self.assertEqual(export_assets(d/'lib',outfile),2)
            with zipfile.ZipFile(outfile) as z:self.assertIn('sprites/imports/batch_00001/alpha.png',z.namelist())
    def test_reimports_do_not_overwrite(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td);a=d/'one.png';a.write_bytes(b'x')
            one,_=import_assets([a],d/'lib','textures');a.write_bytes(b'y')
            two,_=import_assets([a],d/'lib','textures')
            self.assertNotEqual(one,two)
            self.assertEqual((one/'one.png').read_bytes(),b'x')
    def test_zip_traversal_guard(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td);p=d/'evil.zip'
            with zipfile.ZipFile(p,'w') as z:z.writestr('../outside.png',b'bad')
            with self.assertRaises(ValueError):import_assets([p],d/'lib','textures')
    def test_asset_format_preserve(self):
        with tempfile.TemporaryDirectory() as td:
            d=Path(td);p=d/'new.milk3';p.write_bytes(b'EXAMPLE')
            folder,_=import_assets([p],d/'lib','presets')
            self.assertEqual((folder/'new.milk3').read_bytes(),b'EXAMPLE')
    def test_safe_path_and_classify(self):
        for bad in ('../escape','C:/bad','/absolute','sub/../traversal'):
            with self.assertRaises(ValueError):safe_rel(bad)
        self.assertTrue(classify_preset(b'[preset00]\nper_frame_1=zoom=1;')['preset00'])
    def test_image_copy_optional(self):
        try:from PIL import Image
        except ImportError:self.skipTest('Pillow not installed');return
        with tempfile.TemporaryDirectory() as td:
            d=Path(td);source=d/'in.png';out=d/'out.png'
            im=Image.new('RGBA',(800,600),(255,0,200,0));im.save(source)
            convert_image(source,out,max_side=256)
            with Image.open(out) as a:self.assertLessEqual(max(a.size),256);self.assertEqual(a.mode,'RGBA')
            self.assertTrue(source.exists())
            with self.assertRaises(FileExistsError):convert_image(source,out)
