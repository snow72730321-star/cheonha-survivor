import fs from 'node:fs';
const v10=fs.readFileSync(new URL('../js/vfx/v10.js',import.meta.url),'utf8');
const forbidden=[
  'emitCastVfx(', 'const fireBasicV10=', 'const tickArtsV10=',
  'type:"glyph"','type:"ornateRing"','type:"rune"','type:"sparkCrown"',
  'type:"demonHalo"','type:"arcEcho"','type:"streak"','type:"poisonMote"',
  'const drawVisualsBaseV10='
];
for(const token of forbidden){
  if(v10.includes(token))throw new Error(`legacy procedural VFX token still present: ${token}`);
}
if(!v10.includes('p.shape==="ultimateArrow"')) throw new Error('projectile renderer was unexpectedly removed');
console.log('procedural-vfx-removal-audit: ok');
