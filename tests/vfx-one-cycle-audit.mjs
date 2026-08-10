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
const allowedLoops=['VFXSprites.draw("skillFistGoldenBeam"','VFXSprites.draw(cfg.id,x,y,{age:v.age||0,loop:true'];
let stripped=visualBlock;
for(const allowedLoop of allowedLoops)stripped=stripped.replaceAll(allowedLoop,'ALLOWED_PERSISTENT_VFX_LOOP(');
if(stripped.includes('VFXSprites.draw('))throw new Error('unexpected looping sprite draw remains inside drawVisuals');
for(const allowedLoop of allowedLoops)if(!visualBlock.includes(allowedLoop))throw new Error(`persistent VFX loop exception missing: ${allowedLoop}`);
const orbit=src.slice(b,src.indexOf('/* -------------------------------------------------------------------------- */',b));
if(!orbit.includes('VFXSprites.draw("skillSwordTaiji"'))throw new Error('persistent Taiji state animation should remain looping');
console.log('vfx one-cycle audit passed');
