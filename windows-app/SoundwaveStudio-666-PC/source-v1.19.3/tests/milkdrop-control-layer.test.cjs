'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const sandbox={window:{},console,performance:{now:()=>0},setTimeout,clearTimeout};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'src/vendor/cayatur/preset-registry.js'),'utf8'),sandbox,{filename:'preset-registry.js'});
vm.runInContext(fs.readFileSync(path.join(root,'src/vendor/cayatur/milkdrop-cycle.js'),'utf8'),sandbox,{filename:'milkdrop-cycle.js'});
vm.runInContext(fs.readFileSync(path.join(root,'src/vendor/cayatur/milkdrop-core.js'),'utf8'),sandbox,{filename:'milkdrop-core.js'});
vm.runInContext(fs.readFileSync(path.join(root,'src/vendor/cayatur/milkdrop-renderer.js'),'utf8'),sandbox,{filename:'milkdrop-renderer.js'});

const P=sandbox.window.SVPresets;
assert(P&&typeof P.registerBuiltin==='function');
assert.strictEqual(P.registerBuiltin([
  {id:'a',kind:'milkdrop',source:'A'},
  {id:'b',kind:'milkdrop',source:'B'},
  {id:'c',kind:'shader',source:'C'}
]),3);
assert.strictEqual(JSON.stringify(Array.from(P.byKind('milkdrop'),x=>x.id)),JSON.stringify(['a','b']));

const {Cycle,normalize}=sandbox.window.SVMilkdropCycle;
assert.strictEqual(normalize({autoNext:true,autoNextSeconds:15}).seconds,15);

const list=[{id:'a'},{id:'b'},{id:'c'}];
let cy=new Cycle();
let p=cy.step(1,{autoNext:true,autoNextUnit:'seconds',autoNextSeconds:3,neverRepeat:true,repeatWindow:2,blendTime:1.2},list,'a',{},null,null);
assert.strictEqual(p,null);
p=cy.step(2.1,{autoNext:true,autoNextUnit:'seconds',autoNextSeconds:3,neverRepeat:true,repeatWindow:2,blendTime:1.2},list,'a',{},null,null);
assert(p&&p.id!=='a');
assert.strictEqual(cy.cut,false);
assert.strictEqual(cy.blend,1.2);

cy=new Cycle();
p=cy.step(10,{autoNext:true,autoNextSeconds:3,locked:true},list,'a',{bass:9,treb:9},null,null);
assert.strictEqual(p,null);
assert.strictEqual(cy.reason,'LOCKED');

cy=new Cycle();
p=cy.step(.2,{hardCut:'bass',hardCutBass:1.5,hardCutMinDelay:.15,neverRepeat:true},list,'a',{bass:2,treb:1},null,null);
assert(p&&p.id!=='a');
assert.strictEqual(cy.cut,true);
assert.strictEqual(cy.blend,0);

cy=new Cycle();
cy.history=['b'];
const pool=cy._pool(list,'a',{neverRepeat:true,repeatWindow:8});
assert(pool.every(x=>x.id!=='a'&&x.id!=='b'));

const Tempo=sandbox.window.SVTempo.Tempo;
const tp=new Tempo();
tp.beatsPerBar=4;
tp.update({bass:2},0,.016);
assert.strictEqual(tp.onBar(),true);
tp.setLock(145);
tp.update({bass:0},.5,.5);
assert.strictEqual(tp.bpm,145);

const preset=new sandbox.window.SVMilkdrop.Preset([
  'per_frame_init_1=q1=10;q32=4;',
  'per_frame_1=q1=q1+1;q32=q32+1;',
  'per_pixel_1=q1=q1+1;q32=q32+1;zoom=q1;',
  'wavecode_0_enabled=1',
  'wave_0_init1=t1=2;',
  'wave_0_per_frame1=t1=t1+q1;',
  'wave_0_per_point1=t1=t1+1;x=t1;',
  'shapecode_0_enabled=1',
  'shape_0_init1=t1=5;',
  'shape_0_per_frame1=t1=t1+q1;rad=t1;'
].join('\n'),{accurate:true});
assert.deepStrictEqual(Array.from(preset.errors),[]);
preset.frame({});
preset.captureBase();
assert.strictEqual(preset.pixel(0,0,0,0).zoom,12);
assert.strictEqual(preset.pixel(0,0,0,0).zoom,13);
const wave=preset.waves[0], shape=preset.shapes[0];
assert.strictEqual(preset.waveFrame(wave),true);
assert.strictEqual(preset.wavePoint(wave,0,0,0).x,14);
assert.strictEqual(preset.wavePoint(wave,1,0,0).x,15);
assert.strictEqual(preset.shapeFrame(shape,0).rad,16);
assert.strictEqual(preset.shapeFrame(shape,1).rad,16);

const uniforms={};
const noise=Object.fromEntries(['lq','mq','hq','lqLite','volLq','volHq'].map(k=>[k,{size:1}]));
const renderer={gl:{uniform4f:(loc,...values)=>{uniforms[loc]=values;}},noise,_wantAcc:true};
const setUniforms=sandbox.window.SVModes.milkdrop.prototype._setPresetUniforms;
const context={P:preset,w:1,h:1,aspX:1,aspY:1,presetTime:0,time:0};
setUniforms.call(renderer,{_plan:[],_qa:'qa',_qh:'qh'},context);
assert.deepStrictEqual(uniforms.qa,[11,0,0,0]);
assert.deepStrictEqual(uniforms.qh,[0,0,0,5]);
renderer._wantAcc=false;
setUniforms.call(renderer,{_plan:[],_qa:'qa'},context);
assert.strictEqual(uniforms.qa[0],13);

preset.frame({});
preset.captureBase();
assert.strictEqual(preset.pixel(0,0,0,0).zoom,12);
assert.strictEqual(preset.waveFrame(wave),true);
assert.strictEqual(preset.wavePoint(wave,0,0,0).x,14);
assert.strictEqual(preset.shapeFrame(shape,0).rad,16);

console.log('PASS milkdrop-control-layer 7/7');
console.log('PASS milkdrop q/t frame, vertex, shader and custom-block flow');
