import fs from 'node:fs';
const src=fs.readFileSync(new URL('../js/vfx/sprite-vfx-v14-3-8.js',import.meta.url),'utf8');
const must=[
  'loop=true,fpsOverride=null',
  'if(!loop&&frame===null&&safeAge>=cycle)return false',
  'Math.min(def.frames-1,rawIndex)',
  'function drawOneShot',
  'loop:false',
  'drawOneShot,beam',
  'drawVisuals=function(){'
];
for(const token of must){if(!src.includes(token))throw new Error(`missing one-cycle token: ${token}`)}
const a=src.indexOf('drawVisuals=function(){');
const b=src.indexOf('/** 태극검진은',a);
const visualBlock=src.slice(a,b);
if(!visualBlock.includes('VFXSprites.drawOneShot('))throw new Error('drawVisuals does not use one-shot renderer');
if(visualBlock.includes('VFXSprites.draw('))throw new Error('looping sprite draw remains inside drawVisuals');
const orbit=src.slice(b,src.indexOf('/* -------------------------------------------------------------------------- */',b));
if(!orbit.includes('VFXSprites.draw("skillSwordTaiji"'))throw new Error('persistent Taiji state animation should remain looping');
console.log('vfx one-cycle audit passed');
