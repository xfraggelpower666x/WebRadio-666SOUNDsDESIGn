'use strict';
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const buildDir=path.join(root,'build');
const iconTarget=path.join(buildDir,'radio-wave-v6.66.ico');
const iconBase64=require(path.join(buildDir,'windowsIconBase64.cjs'));

if(!iconBase64 || typeof iconBase64!=='string') {
  throw new Error('RADIO_WAVE_ICON_BASE64_MISSING');
}
fs.mkdirSync(buildDir,{recursive:true});
const bytes=Buffer.from(iconBase64,'base64');
if(bytes.length<1024) throw new Error('RADIO_WAVE_ICON_DECODE_TOO_SMALL');
fs.writeFileSync(iconTarget,bytes);
const readback=fs.readFileSync(iconTarget);
if(!readback.equals(bytes)) throw new Error('RADIO_WAVE_ICON_READBACK_FAIL');
console.log('[RADIO WAVE] icon prepared:',iconTarget,bytes.length,'bytes');
