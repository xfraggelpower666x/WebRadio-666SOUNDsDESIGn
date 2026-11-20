import sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from shader_palette import palette_text, PALETTES, TAG
from generator import render, Settings

class ShaderPaletteTests(unittest.TestCase):
    def test_all_colors(self):
        original=render(Settings())
        for i in range(len(PALETTES)):
            result, name=palette_text(original,i)
            self.assertIn('PSVERSION_COMP=2', result)
            self.assertIn(TAG,result)
            self.assertIn('comp_1=`shader_body',result)
            self.assertIn('bass_att',result)
            self.assertEqual(name,PALETTES[i][0])
        self.assertNotIn(TAG,original)
    def test_recolor_no_duplicate(self):
        original=render(Settings())
        once,_=palette_text(original,0)
        twice,_=palette_text(once,2)
        self.assertEqual(twice.count(TAG),1)
        self.assertEqual(twice.count('comp_1='),1)
    def test_refuse_foreign_shader(self):
        foreign='PSVERSION_COMP=2\n[preset00]\ncomp_1=`shader_body\ncomp_2=`{\ncomp_3=`ret=1;\ncomp_4=`}\n'
        with self.assertRaises(ValueError):palette_text(foreign,0)
    def test_invalid_preset(self):
        with self.assertRaises(ValueError):palette_text('x=2\n',0)

if __name__=='__main__':unittest.main()
