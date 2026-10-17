// Reines, aus der Radio-Szenenlogik abgeleitetes Event-Mapping; keine Cloud-Aufrufe.
const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
export const SCENE_MODE_MAP=Object.freeze({idle:'ambient',build:'cyber',break:'ambient',drop:'club',storm:'club'});
export const THEME_COLORS=Object.freeze({'pink-cyan':{r:255,g:70,b:220},'neon-green':{r:70,g:255,b:170},'cyan-yellow':{r:0,g:220,b:255},'electric-blue':{r:50,g:150,b:255},cyan:{r:0,g:210,b:255}});
export function mapAudioEvent(input={}) {
 const energy=clamp(input.energy??input.level),pulse=clamp(input.pulse);
 const explicit=['idle','build','break','drop','storm'].includes(input.scene)?input.scene:null;
 const scene=explicit??((!input.playing&&energy<0.025)||energy<0.025?'idle':pulse>0.42||energy>0.78?'drop':energy>0.32?'build':energy<0.12?'break':'build');
 const level=(n,w)=>Math.round(clamp((Math.abs(Number(n)||0)<=1.25?(Number(n)||0)*255:Number(n)||0)*w,0,255));
 return {scene,mode:SCENE_MODE_MAP[scene],bass:level(input.bass??input.low,1.15),mid:level(input.mid??input.lowMid,0.95),high:level(input.high??input.highMid,1),energy:level(energy,1),kick:!!input.kick||!!input.beat||pulse>0.24,drop:scene==='drop'||scene==='storm',theme:THEME_COLORS[input.theme]||THEME_COLORS['pink-cyan']};
}
