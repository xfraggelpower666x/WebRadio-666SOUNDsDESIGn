const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
class Node{constructor(){this.hidden=true;this.attrs={};this.handlers={};this.value='';}addEventListener(k,f){this.handlers[k]=f}setAttribute(k,v){this.attrs[k]=v}focus(){this.focused=true}select(){this.selected=true}}
const nodes=Object.fromEntries(['embedBtn','embedPanel','embedCode','copyEmbedBtn','embedCopyStatus'].map(k=>[k,new Node()]));let copied;
const navigator={clipboard:{writeText:async text=>{copied=text}}};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../public/js/embed-copy.js'),'utf8'),{document:{getElementById:k=>nodes[k]},navigator});
(async()=>{const {embedBtn:open,embedPanel:panel,embedCode:code,copyEmbedBtn:copy,embedCopyStatus:status}=nodes;
assert(code.value.includes('https://webradio.666soundsdesign-broadcaster.com/embed/miniplayer.html'));assert(code.value.includes('allow="autoplay"'));assert(!code.value.includes('token'));
open.handlers.click();assert.equal(panel.hidden,false);assert.equal(open.attrs['aria-expanded'],'true');assert(code.focused);
await copy.handlers.click();assert.equal(copied,code.value);assert.equal(status.textContent,'Kopiert! / Copied!');assert.equal(copy.disabled,false);
navigator.clipboard.writeText=async()=>{throw Error('blocked')};await copy.handlers.click();assert(code.selected);assert(status.textContent.includes('manuell'));assert.equal(copy.disabled,false);
delete navigator.clipboard;await copy.handlers.click();assert(code.selected);
panel.handlers.keydown({key:'Escape'});assert(panel.hidden);assert.equal(open.attrs['aria-expanded'],'false');assert(open.focused);
console.log('PASS: public iframe snippet, panel, clipboard success/denied/unavailable, manual fallback, Escape and focus. Headless DOM test.');})().catch(e=>{console.error(e);process.exit(1)});
