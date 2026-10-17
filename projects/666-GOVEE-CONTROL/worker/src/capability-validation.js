// Fail-closed: nur explizit vom jeweiligen Gerät angebotene und gültige Werte.
const allowed=new Set(['devices.capabilities.on_off','devices.capabilities.range','devices.capabilities.color_setting','devices.capabilities.color_temperature']);
const int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
function inAdvertisedRange(value,parameters){
 const range=parameters?.range;
 return !!range&&typeof range==='object'&&Number.isFinite(range.min)&&Number.isFinite(range.max)&&range.min<=range.max&&int(value,range.min,range.max);
}
export function validateCapability(device,c){
 if(!c||typeof c!=='object'||Array.isArray(c)||typeof c.type!=='string'||typeof c.instance!=='string'||!Object.hasOwn(c,'value')||!allowed.has(c.type))return false;
 const advertised=(device?.capabilities||[]).find(x=>x.type===c.type&&x.instance===c.instance);
 if(!advertised)return false;
 if(c.type==='devices.capabilities.on_off')return c.instance==='powerSwitch'&&(c.value===0||c.value===1);
 if(c.type==='devices.capabilities.range'||c.type==='devices.capabilities.color_temperature')return inAdvertisedRange(c.value,advertised.parameters);
 if(c.type==='devices.capabilities.color_setting')return c.instance==='colorRgb'&&int(c.value,0,0xffffff);
 return false;
}
