import fs from 'node:fs';

const files = ['index.html', 'public/index.html'];
const oldBlock = `  function installFooter(a){
    if(!a)return;
    var footer=qs('.smfp-v181-footer-version',a);
    if(!footer){footer=document.createElement('div');footer.className='smfp-v181-footer-version';}
    footer.textContent='WebRadio 666SOUNDsDESIGn '+version().toUpperCase();
    var bottom=qs('.mff-bottom',a)||qs('.mff-bottom-bars',a);
    if(bottom&&bottom.parentNode&&footer.parentNode!==bottom.parentNode)bottom.parentNode.insertBefore(footer,bottom.nextSibling);
  }`;
const newBlock = `  function installFooter(a){
    if(!a)return;
    qsa('.smfp-v181-footer-version',a).forEach(function(footer){
      try{footer.remove();}catch(e){if(footer.parentNode)footer.parentNode.removeChild(footer);}
    });
  }`;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes(oldBlock)) throw new Error(`${file}: expected legacy footer block not found`);
  fs.writeFileSync(file, src.replace(oldBlock, newBlock));
}

fs.writeFileSync('tests/single-version-source.test.mjs', `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\nfor (const file of ['index.html','public/index.html']) {\n  const src = fs.readFileSync(file, 'utf8');\n  test(file + ': mobile has one canonical visible version source', () => {\n    assert.match(src, /qsa\\('\\.smfp-v181-footer-version',a\\)\\.forEach/);\n    assert.doesNotMatch(src, /footer\\.textContent='WebRadio 666SOUNDsDESIGn '/);\n    assert.match(src, /class=\\"smfp-version-badge\\"/);\n  });\n}\n`);
