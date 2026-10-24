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

const P=sandbox.window.SVPresets;
assert(P&&typeof P.registerBuiltin==='function');
assert.strictEqual(P.registerBuiltin([
  {id:'a',kind:'milkdrop',source:'A'},
  {id:'b',kind:'milkdrop',source:'B'},
  {id:'c',kind:'shader',source:'C'}
]),3);
assert.deepStrictEqual(P.byKind('milkdrop').map(x=>x.id),['a','b']);

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

console.log('PASS milkdrop-control-layer 7/7');
